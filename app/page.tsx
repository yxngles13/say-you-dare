import { CreateRoomForm, JoinRoomForm, HostLoginForm } from "@/components/forms";

export default function Home() {
  return (
    <div className="stack">
      <div>
        <h1>Say You Dare</h1>
        <p className="muted">A party game built around secret dares.</p>
      </div>
      <section className="card stack">
        <h2>Join a party</h2>
        <JoinRoomForm />
      </section>
      <section className="card stack">
        <h2>Host a party</h2>
        <CreateRoomForm />
      </section>
      <details className="card">
        <summary>Already hosting? Log back in with your host PIN</summary>
        <HostLoginForm />
      </details>
    </div>
  );
}
