import Link from "next/link";
import { Framed } from "@/components/Framed";

export default function NotFound() {
  return (
    <Framed>
      <h1>Lost?</h1>
      <p className="eyebrow">this room has vanished, or never was. check the PIN and try again.</p>
      <div>
        <Link className="button" href="/">Back to start</Link>
      </div>
    </Framed>
  );
}
