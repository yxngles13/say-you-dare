"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getRoomById,
  getRoomByPin,
  normalizeHostKey,
  normalizePin,
  PIN_LIFETIME_MS,
  requireHost,
  requirePlayer,
  sameSecret,
  startSession,
} from "@/lib/auth";
import { assignNewDare } from "@/lib/game";
import { randomRoomName } from "@/lib/names";
import { MAX_DARE_LENGTH, MAX_DARES_PER_ROOM, PACKS, parseDareText, type PackDare } from "@/lib/packs";
import { db, PROOF_BUCKET } from "@/lib/supabase";
import type { Dare, FormState, Player, Room, RoomStatus } from "@/lib/types";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UNIQUE_VIOLATION = "23505";

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const refresh = (roomId: string) => revalidatePath(`/r/${roomId}`, "layout");

const randomPin = () => String(randomInt(10000)).padStart(4, "0");
const randomHostKey = () => Array.from({ length: 8 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]).join("");

// ---------- Rooms & joining ----------

export async function createRoom(_: FormState, form: FormData): Promise<FormState> {
  const hostName = field(form, "hostName");
  if (!hostName || hostName.length > 18) return { error: "Your name must be 1–18 characters." };

  let room: { id: string } | null = null;
  for (let attempt = 0; attempt < 20 && !room; attempt++) {
    const pin = randomPin();
    // Free the PIN if it belongs to a room older than 24h, so PINs get reused.
    await db()
      .from("rooms")
      .update({ code: null })
      .eq("code", pin)
      .lt("created_at", new Date(Date.now() - PIN_LIFETIME_MS).toISOString());
    const { data, error } = await db()
      .from("rooms")
      .insert({ code: pin, name: randomRoomName(), host_key: randomHostKey() })
      .select("id")
      .single();
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    room = data;
  }
  if (!room) return { error: "Couldn't find a free PIN. Try again." };

  const { data: host, error } = await db()
    .from("players")
    .insert({ room_id: room.id, name: hostName, is_host: true })
    .select("id")
    .single();
  if (error) throw error;

  await startSession(room.id, host.id);
  redirect(`/r/${room.id}/host`);
}

/** Join by typing a PIN (home page) or from the QR / invite link (roomId in a hidden field). */
export async function joinRoom(_: FormState, form: FormData): Promise<FormState> {
  const name = field(form, "name");
  if (!name || name.length > 18) return { error: "Your name must be 1–18 characters." };

  const roomId = field(form, "roomId");
  const room = roomId ? await getRoomById(roomId) : await getRoomByPin(field(form, "pin"));
  if (!room) return { error: roomId ? "This room no longer exists." : "No room with that PIN." };

  const { data: player, error } = await db()
    .from("players")
    .insert({ room_id: room.id, name })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) return { error: "Someone in this room already has that name." };
  if (error) throw error;

  await startSession(room.id, player.id);
  refresh(room.id);
  redirect(`/r/${room.id}`);
}

/** Lets the host get back into host controls on another device or after cookies are cleared. */
export async function hostLogin(_: FormState, form: FormData): Promise<FormState> {
  const roomId = field(form, "roomId");
  const room: Room | null = roomId ? await getRoomById(roomId) : await getRoomByPin(field(form, "pin"));
  if (!room || !sameSecret(normalizeHostKey(field(form, "hostKey")), room.host_key)) {
    return { error: "That host login code is incorrect." };
  }

  const { data: host, error } = await db()
    .from("players")
    .select("id")
    .eq("room_id", room.id)
    .eq("is_host", true)
    .single();
  if (error) throw error;

  await startSession(room.id, host.id);
  redirect(`/r/${room.id}/host`);
}

// ---------- Playing ----------

export async function submitProof(roomId: string, form: FormData): Promise<FormState> {
  const { room, player } = await requirePlayer(roomId);
  if (room.status !== "active") return { error: "The game isn't running right now." };

  const dareId = field(form, "dareId");
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first." };
  if (photo.size > MAX_PHOTO_BYTES) return { error: "That photo is too large (4 MB max)." };
  const extension = PHOTO_TYPES[photo.type];
  if (!extension) return { error: "Photos must be JPEG, PNG or WebP." };

  // Claim the dare first, so a double-tap can't score the same dare twice.
  const { data: claimed, error: claimError } = await db()
    .from("players")
    .update({ current_dare_id: null })
    .eq("id", player.id)
    .eq("current_dare_id", dareId)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return { error: "That dare is no longer yours. Refresh to see your current one." };

  const { data: dare, error: dareError } = await db().from("dares").select("*").eq("id", dareId).maybeSingle();
  if (dareError) throw dareError;
  if (!dare) {
    await assignNewDare({ ...player, current_dare_id: null });
    refresh(room.id);
    return { error: "The host removed that dare. You've been given a new one." };
  }

  const path = `${room.id}/${player.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await db()
    .storage.from(PROOF_BUCKET)
    .upload(path, photo, { contentType: photo.type });
  if (uploadError) {
    await db().from("players").update({ current_dare_id: dareId }).eq("id", player.id);
    return { error: "Upload failed. Please try again." };
  }

  const { error: insertError } = await db().from("submissions").insert({
    room_id: room.id,
    player_id: player.id,
    dare_id: dare.id,
    dare_text: (dare as Dare).text,
    points: (dare as Dare).points,
    photo_path: path,
  });
  if (insertError) throw insertError;

  await assignNewDare({ ...player, current_dare_id: dareId });
  refresh(room.id);
  return undefined;
}

/** Claim the current dare as done, naming another player who saw it. Points wait for their word. */
export async function claimDare(roomId: string, dareId: string, witnessId: string): Promise<FormState> {
  const { room, player } = await requirePlayer(roomId);
  if (room.status !== "active") return { error: "The game isn't running right now." };
  if (witnessId === player.id) return { error: "Pick someone else as your witness." };

  const { data: witness, error: witnessError } = await db()
    .from("players")
    .select("id")
    .eq("id", witnessId)
    .eq("room_id", room.id)
    .maybeSingle();
  if (witnessError) throw witnessError;
  if (!witness) return { error: "That witness has left the party. Pick someone else." };

  // Claim the dare first, so a double-tap can't score the same dare twice.
  const { data: claimed, error: claimError } = await db()
    .from("players")
    .update({ current_dare_id: null })
    .eq("id", player.id)
    .eq("current_dare_id", dareId)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return { error: "That dare is no longer yours. Refresh to see your current one." };

  const { data: dare, error: dareError } = await db().from("dares").select("*").eq("id", dareId).maybeSingle();
  if (dareError) throw dareError;
  if (!dare) {
    await assignNewDare({ ...player, current_dare_id: null });
    refresh(room.id);
    return { error: "The host removed that dare. You've been given a new one." };
  }

  const { error: insertError } = await db().from("submissions").insert({
    room_id: room.id,
    player_id: player.id,
    dare_id: dare.id,
    dare_text: (dare as Dare).text,
    points: (dare as Dare).points,
    witness_id: witnessId,
    status: "pending",
  });
  if (insertError) throw insertError;

  await assignNewDare({ ...player, current_dare_id: dareId });
  refresh(room.id);
  return undefined;
}

/** The named witness confirms a claim (points land) or calls it out (no points). */
export async function judgeClaim(roomId: string, submissionId: string, saw: boolean) {
  const { room, player } = await requirePlayer(roomId);

  const { data: sub, error } = await db()
    .from("submissions")
    .update({ status: saw ? "approved" : "rejected" })
    .eq("id", submissionId)
    .eq("room_id", room.id)
    .eq("witness_id", player.id)
    .eq("status", "pending")
    .select("player_id")
    .maybeSingle();
  if (error) throw error;

  // A claimer with nothing left to do may have a dare again now that one was called out.
  if (sub && !saw) {
    const { data: owner } = await db().from("players").select("*").eq("id", sub.player_id).maybeSingle();
    if (owner && !(owner as Player).current_dare_id && room.status === "active") await assignNewDare(owner as Player);
  }
  refresh(room.id);
}

export async function skipDare(roomId: string) {
  const { room, player } = await requirePlayer(roomId);
  if (room.status !== "active") return;
  await assignNewDare(player);
  refresh(room.id);
}

// ---------- Host controls ----------

export async function setRoomStatus(roomId: string, status: RoomStatus) {
  const { room } = await requireHost(roomId);
  if (status === "active") {
    const { count, error } = await db()
      .from("dares")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if (error) throw error;
    if (!count) throw new Error("Add at least one dare before starting.");
  }
  const { error } = await db().from("rooms").update({ status }).eq("id", room.id);
  if (error) throw error;
  refresh(room.id);
}

export async function addDare(roomId: string, _: FormState, form: FormData): Promise<FormState> {
  const { room } = await requireHost(roomId);
  const text = field(form, "text");
  const points = Number(field(form, "points") || 1);
  if (!text || text.length > MAX_DARE_LENGTH) return { error: `A dare must be 1–${MAX_DARE_LENGTH} characters.` };
  if (!Number.isInteger(points) || points < 1 || points > 5) return { error: "Points must be 1–5." };

  const result = await insertDares(room.id, [{ text, points }]);
  if (result.duplicates) return { error: "That dare is already in the room." };
  if (result.overCap) return { error: `Rooms hold up to ${MAX_DARES_PER_ROOM} dares.` };
  refresh(room.id);
  return undefined;
}

/** Insert dares into a room, skipping ones it already has (same text, any case) and respecting the room cap. */
async function insertDares(roomId: string, dares: PackDare[]): Promise<{ added: number; duplicates: number; overCap: number }> {
  const { data: existing, error } = await db().from("dares").select("text").eq("room_id", roomId);
  if (error) throw error;
  const seen = new Set((existing ?? []).map((d) => d.text.toLowerCase()));
  const fresh = dares.filter((d) => {
    const key = d.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const space = Math.max(0, MAX_DARES_PER_ROOM - (existing?.length ?? 0));
  const toInsert = fresh.slice(0, space);
  if (toInsert.length) {
    const { error: insertError } = await db()
      .from("dares")
      .insert(toInsert.map((d) => ({ room_id: roomId, text: d.text, points: d.points })));
    if (insertError) throw insertError;
  }
  return { added: toInsert.length, duplicates: dares.length - fresh.length, overCap: fresh.length - toInsert.length };
}

function describeInsert(result: { added: number; duplicates: number; overCap: number }, skipped = 0): string {
  const parts = [`Added ${result.added} dare${result.added === 1 ? "" : "s"}.`];
  if (result.duplicates) parts.push(`${result.duplicates} already in the room.`);
  if (skipped) parts.push(`${skipped} line${skipped === 1 ? "" : "s"} skipped (empty, over ${MAX_DARE_LENGTH} characters, or bad points).`);
  if (result.overCap) parts.push(`${result.overCap} left out: rooms hold up to ${MAX_DARES_PER_ROOM} dares.`);
  return parts.join(" ");
}

export async function addPack(roomId: string, _: FormState, form: FormData): Promise<FormState> {
  const { room } = await requireHost(roomId);
  const pack = PACKS.find((p) => p.id === field(form, "packId"));
  if (!pack) return { error: "Unknown pack." };
  const result = await insertDares(room.id, pack.dares);
  refresh(room.id);
  return { message: `${pack.name} pack: ${describeInsert(result)}` };
}

export async function importDares(roomId: string, _: FormState, form: FormData): Promise<FormState> {
  const { room } = await requireHost(roomId);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .txt file first." };
  if (file.size > 100 * 1024) return { error: "That file is too large (100 KB max)." };

  const { dares, skipped } = parseDareText(await file.text());
  if (!dares.length) return { error: "No dares found. Put one dare per line." };
  const result = await insertDares(room.id, dares);
  refresh(room.id);
  return { message: describeInsert(result, skipped) };
}

export async function clearDares(roomId: string) {
  const { room } = await requireHost(roomId);
  const { error } = await db().from("dares").delete().eq("room_id", room.id);
  if (error) throw error;
  refresh(room.id);
}

export async function deleteDare(roomId: string, dareId: string) {
  const { room } = await requireHost(roomId);
  // Players holding this dare get a new one next time their page loads (FK is ON DELETE SET NULL).
  const { error } = await db().from("dares").delete().eq("id", dareId).eq("room_id", room.id);
  if (error) throw error;
  refresh(room.id);
}

export async function removePlayer(roomId: string, playerId: string) {
  const { room, player: host } = await requireHost(roomId);
  if (playerId === host.id) throw new Error("You can't remove yourself.");

  const { data: photos } = await db().from("submissions").select("photo_path").eq("player_id", playerId);
  const { error } = await db().from("players").delete().eq("id", playerId).eq("room_id", room.id);
  if (error) throw error;
  const paths = (photos ?? []).flatMap((p) => (p.photo_path ? [p.photo_path] : []));
  if (paths.length) await db().storage.from(PROOF_BUCKET).remove(paths);
  refresh(room.id);
}

export async function setSubmissionStatus(roomId: string, submissionId: string, status: "approved" | "rejected") {
  const { room } = await requireHost(roomId);

  if (status === "approved") {
    // Don't restore a proof if the player has since redone that dare (no double points).
    const { data: target } = await db().from("submissions").select("player_id, dare_id").eq("id", submissionId).maybeSingle();
    if (target?.dare_id) {
      const { count } = await db()
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("player_id", target.player_id)
        .eq("dare_id", target.dare_id)
        .eq("status", "approved");
      if (count) return;
    }
  }

  const { data: sub, error } = await db()
    .from("submissions")
    .update({ status })
    .eq("id", submissionId)
    .eq("room_id", room.id)
    .select("player_id")
    .maybeSingle();
  if (error) throw error;

  // A player with nothing left to do may have a dare again now that one was rejected.
  if (sub && status === "rejected") {
    const { data: owner } = await db().from("players").select("*").eq("id", sub.player_id).maybeSingle();
    if (owner && !(owner as Player).current_dare_id) await assignNewDare(owner as Player);
  }
  refresh(room.id);
}
