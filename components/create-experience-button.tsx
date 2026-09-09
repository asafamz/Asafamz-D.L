"use client";
import { useState } from "react";
export default function CreateExperienceButton({ companyId, productId }: { companyId: string; productId: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function create() { setBusy(true); setMessage("Creating…"); try { const r = await fetch("/api/admin/create-experience", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({companyId, productId})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Failed"); setMessage("✓ Created — refresh this page."); } catch(e){setMessage(e instanceof Error?e.message:"Failed");} finally{setBusy(false);} }
  return <div><button className="btn secondary" onClick={create} disabled={busy}>{busy?"Creating…":"Create library"}</button>{message&&<div className="upload-message">{message}</div>}</div>;
}
