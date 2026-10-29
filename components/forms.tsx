"use client";

import { useActionState } from "react";
import { addDare, createRoom, hostLogin, joinRoom } from "@/app/actions";

function Error({ message }: { message?: string }) {
  return message ? <p className="error">{message}</p> : null;
}

export function CreateRoomForm() {
  const [state, action, pending] = useActionState(createRoom, undefined);
  return (
    <form action={action} className="stack">
      <label>Party name <input name="partyName" required maxLength={40} placeholder="Halloween Party" /></label>
      <label>Your name <input name="hostName" required maxLength={18} placeholder="Your name" /></label>
      <label>Room password <input name="password" required minLength={4} placeholder="Guests need this to join" /></label>
      <label>Host PIN <input name="hostPin" type="password" required minLength={4} placeholder="Only you know this" /></label>
      <button disabled={pending}>{pending ? "Creating…" : "Create room"}</button>
      <Error message={state?.error} />
    </form>
  );
}

/** Pass `code` when the room is already known (e.g. on the invite link page). */
export function JoinRoomForm({ code }: { code?: string }) {
  const [state, action, pending] = useActionState(joinRoom, undefined);
  return (
    <form action={action} className="stack">
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <label>Room code <input name="code" required maxLength={6} placeholder="AB12CD" autoCapitalize="characters" /></label>
      )}
      <label>Room password <input name="password" type="password" required /></label>
      <label>Your name <input name="name" required maxLength={18} /></label>
      <button disabled={pending}>{pending ? "Joining…" : "Join room"}</button>
      <Error message={state?.error} />
    </form>
  );
}

export function HostLoginForm({ code }: { code?: string }) {
  const [state, action, pending] = useActionState(hostLogin, undefined);
  return (
    <form action={action} className="stack" style={{ marginTop: 12 }}>
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <label>Room code <input name="code" required maxLength={6} autoCapitalize="characters" /></label>
      )}
      <label>Host PIN <input name="hostPin" type="password" required /></label>
      <button className="secondary" disabled={pending}>{pending ? "Checking…" : "Log in as host"}</button>
      <Error message={state?.error} />
    </form>
  );
}

export function AddDareForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(addDare.bind(null, code), undefined);
  return (
    <form action={action} className="stack">
      <label>New dare <input name="text" required maxLength={200} placeholder="Get someone to say 'midnight'." /></label>
      <div className="row">
        <label className="grow">
          Points
          <select name="points" defaultValue="1">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button disabled={pending} style={{ alignSelf: "end" }}>Add dare</button>
      </div>
      <Error message={state?.error} />
    </form>
  );
}
