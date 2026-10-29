"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <h1>Something went wrong</h1>
      <p className="error">{error.message}</p>
      <div className="row">
        <button onClick={reset}>Try again</button>
        <a href="/">Back to start</a>
      </div>
    </div>
  );
}
