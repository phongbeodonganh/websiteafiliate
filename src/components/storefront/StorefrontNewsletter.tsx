"use client";

import { FormEvent, useState } from "react";
import styles from "./storefront.module.css";

export default function StorefrontNewsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || (response.ok ? "Hãy kiểm tra hộp thư để xác nhận." : "Vui lòng thử lại."));
      if (response.ok) setEmail("");
    } catch {
      setMessage("Chưa thể đăng ký lúc này. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={subscribe}>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" aria-label="Địa chỉ email" required />
      <button type="submit" disabled={loading}>{loading ? "Đang đăng ký..." : "Nhận bản tin"}</button>
      {message && <span className={styles.newsletterMessage} role="status">{message}</span>}
    </form>
  );
}
