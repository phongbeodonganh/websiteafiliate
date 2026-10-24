"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Mail, Sparkles, TriangleAlert } from "lucide-react";
import styles from "./storefront.module.css";

type FormState = { type: "idle" | "loading" | "success" | "error"; message: string };

export default function StorefrontNewsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>({ type: "idle", message: "" });

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setState({ type: "loading", message: "" });
    try {
      const response = await fetch("/api/v1/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(data?.message || "Subscription could not be completed.");
      setState({ type: "success", message: data?.message || "Check your inbox to confirm your subscription." });
      setEmail("");
    } catch (error) {
      setState({ type: "error", message: error instanceof Error ? error.message : "We could not add you just now. Please try again." });
    }
  };

  return (
    <section className={styles.newsletter} aria-labelledby="newsletter-title">
      <div>
        <p className={styles.newsletterKicker}><Sparkles aria-hidden="true" /> TheHavenDeals shortlist</p>
        <h2 id="newsletter-title">Useful picks, once a week.</h2>
        <p>New recommendations, meaningful price drops and practical buying notes. No daily inbox noise.</p>
      </div>
      <form onSubmit={subscribe} noValidate>
        <Mail aria-hidden="true" />
        <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" aria-label="Email address" aria-describedby={state.message ? "newsletter-status" : undefined} required />
        <button type="submit" disabled={state.type === "loading"}>{state.type === "loading" ? <Loader2 className={styles.newsletterSpin} aria-hidden="true" /> : null}{state.type === "loading" ? "Joining…" : "Join the shortlist"}</button>
        {state.message && <span id="newsletter-status" className={styles.newsletterMessage} data-state={state.type} role="status">{state.type === "success" ? <CheckCircle2 aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}{state.message}</span>}
      </form>
    </section>
  );
}
