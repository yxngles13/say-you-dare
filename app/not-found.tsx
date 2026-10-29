import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <h1>Room not found</h1>
      <p className="muted">Check the room code and try again.</p>
      <Link href="/">Back to start</Link>
    </div>
  );
}
