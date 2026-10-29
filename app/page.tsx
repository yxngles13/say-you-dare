import Link from "next/link";
import { Framed } from "@/components/Framed";

export default function Home() {
  return (
    <>
      <Framed>
        <p className="eyebrow">a party game of secret dares</p>
        <h1 className="title">Say<br />you<br />Dare</h1>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="button" href="/host">Host</Link>
          <Link className="button secondary" href="/join">Join</Link>
        </div>
      </Framed>
      <div className="beneath">
        <Link className="eyebrow" href="/host?login=1">Already hosting? Log back in</Link>
      </div>
    </>
  );
}
