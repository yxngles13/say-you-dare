"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitProof } from "@/app/actions";

const MAX_SIDE = 1600;

/** Shrink phone photos (often 5–12 MB) to a ~300 KB JPEG before upload. */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file; // Browser can't decode it; let the server validate the original.
  }
}

export function ProofUpload({ code, dareId }: { code: string; dareId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next: File | null) {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setMessage(null);
  }

  function submit() {
    if (!file) return;
    startTransition(async () => {
      const form = new FormData();
      form.set("dareId", dareId);
      form.set("photo", await compress(file), "proof");
      const result = await submitProof(code, form);
      if (result?.error) {
        setMessage(result.error);
      } else {
        choose(null);
        setInputKey((k) => k + 1); // clear the file input
        setMessage("Proof submitted!");
      }
      router.refresh();
    });
  }

  return (
    <div className="stack">
      <input
        key={inputKey}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
      />
      {preview && <img src={preview} alt="Your proof" className="proof" />}
      {file && (
        <button onClick={submit} disabled={pending}>
          {pending ? "Uploading…" : "Submit proof"}
        </button>
      )}
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
