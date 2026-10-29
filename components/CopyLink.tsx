"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="row">
      <code className="grow" style={{ overflowWrap: "anywhere", fontSize: 12 }}>{url}</code>
      <button
        className="secondary small"
        onClick={async () => {
          await navigator.clipboard.writeText(url).catch(() => {});
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
