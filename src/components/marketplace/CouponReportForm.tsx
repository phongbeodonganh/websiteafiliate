"use client";

import { FormEvent, useState } from "react";
import { Flag, Loader2, Send } from "lucide-react";
import styles from "./CouponReportForm.module.css";

export default function CouponReportForm({ defaultStore = "" }: { defaultStore?: string }) {
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus({ type: "loading" }); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    try { const response = await fetch("/api/v1/public/coupon-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json() as { message?: string }; if (!response.ok) throw new Error(result.message || "Report could not be sent."); setStatus({ type: "success", message: result.message }); form.reset(); }
    catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Report could not be sent." }); }
  }
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.formHeading}><Flag/><div><h3>Report a coupon problem</h3><p>Your report enters the priority re-test queue.</p></div></div>
    <div className={styles.fields}><label>Store name<input name="store" defaultValue={defaultStore} maxLength={120} placeholder="e.g. BeaverCraft" /></label><label>Coupon code<input name="code" maxLength={80} placeholder="e.g. SAVE10" /></label><label className={styles.wide}>GoodPick page URL<input name="pageUrl" type="url" required maxLength={500} placeholder="https://…" /></label><label>What went wrong?<select name="reason" required defaultValue="not_applied"><option value="not_applied">Code was not applied</option><option value="expired">Code is expired</option><option value="wrong_discount">Discount amount is wrong</option><option value="other">Something else</option></select></label><label>Your email (optional)<input name="email" type="email" maxLength={254} placeholder="For a follow-up only" /></label><label className={styles.wide}>Extra detail<textarea name="details" maxLength={1000} rows={4} placeholder="What was in your basket and what message appeared?" /></label><label className={styles.honeypot} aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <button type="submit" disabled={status.type==="loading"}>{status.type==="loading"?<Loader2 className={styles.spin}/>:<Send/>}{status.type==="loading"?"Sending report…":"Send priority report"}</button>
    {status.message&&<p className={status.type==="success"?styles.success:styles.error} role="status">{status.message}</p>}
  </form>;
}
