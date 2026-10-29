"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRoom, hashSecret, normalizeCode, requireHost, requirePlayer, startSession, verifySecret } from "@/lib/auth";
import { assignNewDare } from "@/lib/game";
import { db, PROOF_BUCKET } from "@/lib/supabase";
import type { Dare, FormState, Player, RoomStatus } from "@/lib/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UNIQUE_VIOLATION = "23505";

const field = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const refresh = (code: string) => revalidatePath(`/r/${code}`, "layout");

function generateCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

// ---------- Rooms & joining ----------

export async function createRoom(_: FormState, form: FormData): Promise<FormState> {
  const partyName = field(form, "partyName");
  const hostName = field(form, "hostName");
  const password = field(form, "password");
  const hostPin = field(form, "hostPin");

  if (!partyName || partyName.length > 40) return { error: "Party name must be 1–40 characters." };
  if (!hostName || hostName.length > 18) return { error: "Your name must be 1–18 characters." };
  if (password.length < 4) return { error: "Room password must be at least 4 characters." };
  if (hostPin.length < 4) return { error: "Host PIN must be at least 4 characters." };
  if (hostPin === password) return { error: "Host PIN must be different from the room password." };

  const [passwordHash, pinHash] = await Promise.all([hashSecret(password), hashSecret(hostPin)]);

  let room: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !room; attempt++) {
    const { data, error } = await db()
      .from("rooms")
      .insert({ code: generateCode(), name: partyName, password_hash: passwordHash, host_pin_hash: pinHash })
      .select("id, code")
      .single();
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    room = data;
  }
  if (!room) return { error: "Couldn't create a room code. Try again." };

  const { data: host, error } = await db()
    .from("players")
    .insert({ room_id: room.id, name: hostName, is_host: true })
    .select("id")
    .single();
  if (error) throw error;

  await startSession(room.code, host.id);
  redirect(`/r/${room.code}/host`);
}

export async function joinRoom(_: FormState, form: FormData): Promise<FormState> {
  const code = normalizeCode(field(form, "code"));
  const password = field(form, "password");
  const name = field(form, "name");

  if (!name || name.length > 18) return { error: "Your name must be 1–18 characters." };

  const room = code ? await getRoom(code) : null;
  if (!room || !(await verifySecret(password, room.password_hash))) {
    return { error: "That room code or password is incorrect." };
  }

  const { data: player, error } = await db()
    .from("players")
    .insert({ room_id: room.id, name })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) return { error: "Someone in this room already has that name." };
  if (error) throw error;

  await startSession(room.code, player.id);
  refresh(room.code);
  redirect(`/r/${room.code}`);
}

/** Lets the host get back into host controls on another device or after cookies are cleared. */
export async function hostLogin(_: FormState, form: FormData): Promise<FormState> {
  const code = normalizeCode(field(form, "code"));
  const pin = field(form, "hostPin");

  const room = code ? await getRoom(code) : null;
  if (!room || !(await verifySecret(pin, room.host_pin_hash))) {
    return { error: "That room code or host PIN is incorrect." };
  }

  const { data: host, error } = await db()
    .from("players")
    .select("id")
    .eq("room_id", room.id)
    .eq("is_host", true)
    .single();
  if (error) throw error;

  await startSession(room.code, host.id);
  redirect(`/r/${room.code}/host`);
}

// ---------- Playing ----------

export async function submitProof(code: string, form: FormData): Promise<FormState> {
  const { room, player } = await requirePlayer(code);
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
    refresh(room.code);
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
  refresh(room.code);
  return undefined;
}

export async function skipDare(code: string) {
  const { room, player } = await requirePlayer(code);
  if (room.status !== "active") return;
  await assignNewDare(player);
  refresh(room.code);
}

// ---------- Host controls ----------

export async function setRoomStatus(code: string, status: RoomStatus) {
  const { room } = await requireHost(code);
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
  refresh(room.code);
}

export async function addDare(code: string, _: FormState, form: FormData): Promise<FormState> {
  const { room } = await requireHost(code);
  const text = field(form, "text");
  const points = Number(field(form, "points") || 1);
  if (!text || text.length > 200) return { error: "A dare must be 1–200 characters." };
  if (!Number.isInteger(points) || points < 1 || points > 5) return { error: "Points must be 1–5." };

  const { error } = await db().from("dares").insert({ room_id: room.id, text, points });
  if (error) throw error;
  refresh(room.code);
  return undefined;
}

export async function deleteDare(code: string, dareId: string) {
  const { room } = await requireHost(code);
  // Players holding this dare get a new one next time their page loads (FK is ON DELETE SET NULL).
  const { error } = await db().from("dares").delete().eq("id", dareId).eq("room_id", room.id);
  if (error) throw error;
  refresh(room.code);
}

export async function removePlayer(code: string, playerId: string) {
  const { room, player: host } = await requireHost(code);
  if (playerId === host.id) throw new Error("You can't remove yourself.");

  const { data: photos } = await db().from("submissions").select("photo_path").eq("player_id", playerId);
  const { error } = await db().from("players").delete().eq("id", playerId).eq("room_id", room.id);
  if (error) throw error;
  if (photos?.length) await db().storage.from(PROOF_BUCKET).remove(photos.map((p) => p.photo_path));
  refresh(room.code);
}

export async function setSubmissionStatus(code: string, submissionId: string, status: "approved" | "rejected") {
  const { room } = await requireHost(code);

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
  refresh(room.code);
}
