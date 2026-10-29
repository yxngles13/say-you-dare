import Link from "next/link";
import { Framed } from "@/components/Framed";
import { CreateRoomForm, HostLoginForm } from "@/components/forms";

export default async function HostStartPage({ searchParams }: PageProps<"/host">) {
  const { login } = await searchParams;
  return (
    <>
      <Framed>
        <h1>Host a Party</h1>
        <p className="eyebrow">name yourself, then invite your guests</p>
        <CreateRoomForm />
      </Framed>
      <div className="beneath">
        <details className="card" open={login === "1"}>
          <summary>Already hosting? Log back in</summary>
          <HostLoginForm />
        </details>
        <Link className="eyebrow" href="/">← back</Link>
      </div>
    </>
  );
}
