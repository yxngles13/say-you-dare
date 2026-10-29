"use client";

import { Framed } from "@/components/Framed";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Framed>
      <h1>Something Went Wrong</h1>
      <p className="error">{error.message}</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button onClick={reset}>Try again</button>
        <a className="button secondary" href="/">Start</a>
      </div>
    </Framed>
  );
}
