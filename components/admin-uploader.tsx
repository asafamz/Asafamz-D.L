"use client";

import { useState } from "react";

export default function AdminUploader({ companyId, productId }: { companyId: string; productId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) return;
    setBusy(true); setMessage("Preparing secure upload…");
    try {
      const start = await fetch("/api/admin/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, filename: file.name }) });
      const startData = await start.json();
      if (!start.ok) throw new Error(startData.error || "Upload setup failed");

      setMessage("Uploading to Whop…");
      const put = await fetch(startData.uploadUrl, { method: "PUT", headers: startData.uploadHeaders || {}, body: file });
      if (!put.ok) throw new Error("The PDF upload failed.");

      setMessage("Finishing upload…");
      let ready = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const check = await fetch("/api/admin/complete-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, productId, fileId: startData.id }) });
        const data = await check.json();
        if (check.ok) { ready = true; break; }
        if (!String(data.error || "").includes("not ready")) throw new Error(data.error || "Could not finish upload");
      }
      if (!ready) throw new Error("Whop is still processing the PDF. Please try again in a moment.");
      setMessage("✓ Cookbook PDF is now connected to this product.");
      setFile(null);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  return <div className="upload-box"><label className="upload-label">Cookbook PDF</label><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={busy} /><button className="btn" onClick={upload} disabled={!file || busy}>{busy ? "Working…" : "Upload & connect PDF"}</button>{message && <p className="upload-message">{message}</p>}</div>;
}
