import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./supabase";
import type { Player, Room } from "./types";

const scryptAsync = promisify(scrypt) as (secret: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_DAYS = 3;

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(secret, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(secret, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// One cookie per room, so the same browser can be in several rooms (e.g. a host testing as a guest).
const cookieName = (roomCode: string) => `syd_${roomCode}`;

export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

export async function startSession(roomCode: string, playerId: string) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await db().from("sessions").insert({ token_hash: sha256(token), player_id: playerId });
  if (error) throw error;
  (await cookies()).set(cookieName(roomCode), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function getRoom(rawCode: string): Promise<Room | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const { data, error } = await db().from("rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

/** The room plus the signed-in player for that room (null if this browser hasn't joined). */
export async function getContext(rawCode: string): Promise<{ room: Room | null; player: Player | null }> {
  const room = await getRoom(rawCode);
  if (!room) return { room: null, player: null };

  const token = (await cookies()).get(cookieName(room.code))?.value;
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

export async function requirePlayer(rawCode: string): Promise<{ room: Room; player: Player }> {
  const { room, player } = await getContext(rawCode);
  if (!room) throw new Error("Room not found.");
  if (!player) throw new Error("You are not in this room.");
  return { room, player };
}

export async function requireHost(rawCode: string): Promise<{ room: Room; player: Player }> {
  const ctx = await requirePlayer(rawCode);
  if (!ctx.player.is_host) throw new Error("Only the host can do that.");
  return ctx;
}
