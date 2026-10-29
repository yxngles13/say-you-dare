"use client";

import { useActionState } from "react";
import { addDare, addPack, createRoom, hostLogin, importDares, joinRoom } from "@/app/actions";

function Error({ message }: { message?: string }) {
  return message ? <p className="error">{message}</p> : null;
}

export function CreateRoomForm() {
  const [state, action, pending] = useActionState(createRoom, undefined);
  return (
    <form action={action} className="stack">
      <label>Your name <input name="hostName" required maxLength={18} placeholder="Your name" /></label>
      <button disabled={pending}>{pending ? "Creating…" : "Create room"}</button>
      <Error message={state?.error} />
    </form>
  );
}

/** Pass `roomId` when the room is already known (QR / invite link page); otherwise ask for the PIN. */
export function JoinRoomForm({ roomId }: { roomId?: string }) {
  const [state, action, pending] = useActionState(joinRoom, undefined);
  return (
    <form action={action} className="stack">
      {roomId ? (
        <input type="hidden" name="roomId" value={roomId} />
      ) : (
        <label>
          Room PIN
          <input name="pin" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" />
        </label>
      )}
      <label>Your name <input name="name" required maxLength={18} /></label>
      <button disabled={pending}>{pending ? "Joining…" : "Join room"}</button>
      <Error message={state?.error} />
    </form>
  );
}

export function HostLoginForm({ roomId }: { roomId?: string }) {
  const [state, action, pending] = useActionState(hostLogin, undefined);
  return (
    <form action={action} className="stack" style={{ marginTop: 12 }}>
      {roomId ? (
        <input type="hidden" name="roomId" value={roomId} />
      ) : (
        <label>
          Room PIN
          <input name="pin" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} />
        </label>
      )}
      <label>
        Host login code
        <input name="hostKey" required autoCapitalize="characters" placeholder="ABCD-EFGH" />
      </label>
      <button className="secondary" disabled={pending}>{pending ? "Checking…" : "Log in as host"}</button>
      <Error message={state?.error} />
    </form>
  );
}

export function AddDareForm({ roomId }: { roomId: string }) {
  const [state, action, pending] = useActionState(addDare.bind(null, roomId), undefined);
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

export function AddPackButton({ roomId, packId, name, count }: { roomId: string; packId: string; name: string; count: number }) {
  const [state, action, pending] = useActionState(addPack.bind(null, roomId), undefined);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="packId" value={packId} />
      <button className="secondary" disabled={pending}>
        {pending ? "Adding…" : `Add ${name} pack (${count} dares)`}
      </button>
      <Error message={state?.error} />
      {state?.message && <p className="muted">{state.message}</p>}
    </form>
  );
}

export function ImportDaresForm({ roomId }: { roomId: string }) {
  const [state, action, pending] = useActionState(importDares.bind(null, roomId), undefined);
  return (
    <form action={action} className="stack">
      <label>
        Import a .txt pack
        <input name="file" type="file" accept=".txt,text/plain" required />
      </label>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        One dare per line. Add <code>| 3</code> at the end for 3 points (default is 1).
      </p>
      <button className="secondary" disabled={pending}>{pending ? "Importing…" : "Import"}</button>
      <Error message={state?.error} />
      {state?.message && <p className="muted">{state.message}</p>}
    </form>
  );
}
