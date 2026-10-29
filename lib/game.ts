import "server-only";
import { db } from "./supabase";
import type { Dare, LeaderboardRow, Player } from "./types";

/**
 * Give the player a random dare they haven't completed yet (and, if possible, not
 * the one they have now). Each player draws independently, so dares stay secret.
 * Returns null when they've done every dare in the room.
 */
export async function assignNewDare(player: Player): Promise<Dare | null> {
  const [{ data: dares, error: daresError }, { data: done, error: doneError }] = await Promise.all([
    db().from("dares").select("*").eq("room_id", player.room_id),
    db().from("submissions").select("dare_id").eq("player_id", player.id).eq("status", "approved"),
  ]);
  if (daresError) throw daresError;
  if (doneError) throw doneError;

  const completed = new Set((done ?? []).map((row) => row.dare_id));
  const remaining = (dares as Dare[]).filter((dare) => !completed.has(dare.id));
  const fresh = remaining.filter((dare) => dare.id !== player.current_dare_id);
  const pool = fresh.length ? fresh : remaining;
  const next = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;

  const { error } = await db()
    .from("players")
    .update({ current_dare_id: next?.id ?? null })
    .eq("id", player.id);
  if (error) throw error;
  return next;
}

/** The player's current dare, drawing one if they don't have one yet. */
export async function ensureDare(player: Player): Promise<Dare | null> {
  if (player.current_dare_id) {
    const { data, error } = await db().from("dares").select("*").eq("id", player.current_dare_id).maybeSingle();
    if (error) throw error;
    if (data) return data as Dare;
  }
  return assignNewDare(player);
}

export async function getLeaderboard(roomId: string): Promise<LeaderboardRow[]> {
  const [{ data: players, error: playersError }, { data: subs, error: subsError }] = await Promise.all([
    db().from("players").select("id, name, is_host").eq("room_id", roomId),
    db().from("submissions").select("player_id, points").eq("room_id", roomId).eq("status", "approved"),
  ]);
  if (playersError) throw playersError;
  if (subsError) throw subsError;

  const totals = new Map<string, { points: number; completed: number }>();
  for (const sub of subs ?? []) {
    const total = totals.get(sub.player_id) ?? { points: 0, completed: 0 };
    total.points += sub.points;
    total.completed += 1;
    totals.set(sub.player_id, total);
  }

  const rows = (players ?? [])
    .map((p) => ({ id: p.id, name: p.name, isHost: p.is_host, ...(totals.get(p.id) ?? { points: 0, completed: 0 }) }))
    .sort((a, b) => b.points - a.points || b.completed - a.completed || a.name.localeCompare(b.name));

  // Players with the same score share a rank.
  return rows.map((row) => ({ ...row, rank: rows.findIndex((r) => r.points === row.points) + 1 }));
}
