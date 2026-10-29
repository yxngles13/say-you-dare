import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";
import type { Player, Room } from "./types";

const SESSION_DAYS = 3;
/** A PIN only finds rooms created within this window; after that it can be reused. */
export const PIN_LIFETIME_MS = 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// One cookie per room, so the same browser can be in several rooms (e.g. a host testing as a guest).
const cookieName = (roomId: string) => `syd_${roomId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePin(raw: string): string | null {
  const pin = raw.trim();
  return /^\d{4}$/.test(pin) ? pin : null;
}

export function normalizeHostKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function startSession(roomId: string, playerId: string) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await db().from("sessions").insert({ token_hash: sha256(token), player_id: playerId });
  if (error) throw error;
  (await cookies()).set(cookieName(roomId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function getRoomById(id: string): Promise<Room | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db().from("rooms").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

export async function getRoomByPin(rawPin: string): Promise<Room | null> {
  const pin = normalizePin(rawPin);
  if (!pin) return null;
  const { data, error } = await db()
    .from("rooms")
    .select("*")
    .eq("code", pin)
    .gt("created_at", new Date(Date.now() - PIN_LIFETIME_MS).toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

/** The room plus the signed-in player for that room (null if this browser hasn't joined). */
export async function getContext(roomId: string): Promise<{ room: Room | null; player: Player | null }> {
  const room = await getRoomById(roomId);
  if (!room) return { room: null, player: null };

  const token = (await cookies()).get(cookieName(room.id))?.value;
  if (!token) return { room, player: null };

  const { data: session, error: sessionError } = await db()
    .from("sessions")
    .select("player_id")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return { room, player: null };

  const { data: player, error } = await db()
    .from("players")
    .select("*")
    .eq("id", session.player_id)
    .eq("room_id", room.id)
    .maybeSingle();
  if (error) throw error;
  return { room, player: player as Player | null };
}

export async function requirePlayer(roomId: string): Promise<{ room: Room; player: Player }> {
  const { room, player } = await getContext(roomId);
  if (!room) throw new Error("Room not found.");
  if (!player) throw new Error("You are not in this room.");
  return { room, player };
}

export async function requireHost(roomId: string): Promise<{ room: Room; player: Player }> {
  const ctx = await requirePlayer(roomId);
  if (!ctx.player.is_host) throw new Error("Only the host can do that.");
  return ctx;
}
