import Link from "next/link";
import { Framed } from "@/components/Framed";
import { JoinRoomForm } from "@/components/forms";

export default function JoinPage() {
  return (
    <>
      <Framed>
        <h1>Welcome</h1>
        <p className="eyebrow">enter the room PIN from your host</p>
        <JoinRoomForm />
      </Framed>
      <div className="beneath">
        <p className="eyebrow">Got a QR code? Just scan it with your camera.</p>
        <Link className="eyebrow" href="/">← back</Link>
      </div>
    </>
  );
}
