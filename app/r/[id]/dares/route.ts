import { getContext } from "@/lib/auth";
import { formatDareText } from "@/lib/packs";
import { db } from "@/lib/supabase";

/** Host-only download of the room's dares as a .txt pack that can be imported into another room. */
export async function GET(_: Request, { params }: RouteContext<"/r/[id]/dares">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room || !player?.is_host) return new Response("Not found", { status: 404 });

  const { data, error } = await db().from("dares").select("text, points").eq("room_id", room.id).order("created_at");
  if (error) throw error;

  const filename = `${room.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-dares.txt`;
  return new Response(formatDareText(data ?? []), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
