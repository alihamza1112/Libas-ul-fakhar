"use client";

import { useActionState, useEffect, useState } from "react";
import { sendCodeAction, verifyCodeAction, type OtpState } from "./actions";

const RESEND_AFTER = 30;

export function OtpForm({ mode = "login", next, defaultPhone, onDone }: { mode?: "login" | "link"; next?: string; defaultPhone?: string; onDone?: () => void }) {
  const [sent, send, sending] = useActionState<OtpState, FormData>(sendCodeAction, { step: "phone" });
  const [checked, verify, verifying] = useActionState<OtpState, FormData>(verifyCodeAction, { step: "code" });
  const [editing, setEditing] = useState(false);
  const [left, setLeft] = useState(0);

  const step = sent.step === "code" && !editing ? "code" : "phone";

  useEffect(() => {
    if (!sent.sentAt) return;
    const tick = () => setLeft(Math.max(0, RESEND_AFTER - Math.floor((Date.now() - sent.sentAt!) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [sent.sentAt]);

  useEffect(() => {
    if (checked.done) onDone?.();
  }, [checked.done, onDone]);

  if (checked.done) return <p className="bg-emerald-50 p-3 text-sm text-success" role="status">Mobile number verified and added to your account.</p>;

  if (step === "phone") {
    return (
      <form action={(fd) => { setEditing(false); send(fd); }} className="space-y-3">
        <label htmlFor="otp-phone" className="block text-sm">Mobile number</label>
        <input id="otp-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={sent.phone ?? defaultPhone} placeholder="03xx xxxxxxx" className="field" aria-invalid={!!sent.error} />
        {sent.error && <p className="text-sm text-sale" role="alert">{sent.error}</p>}
        <button className="btn btn-primary w-full" disabled={sending}>{sending ? "Sending…" : "Send code"}</button>
        <p className="text-xs text-muted">We’ll send a 6-digit code by SMS/WhatsApp. Standard messaging rates may apply.</p>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Enter the 6-digit code sent to <strong>{sent.phone}</strong>.{" "}
        <button type="button" className="underline" onClick={() => setEditing(true)}>Change</button>
      </p>
      {sent.devCode && (
        <p className="bg-amber-50 p-3 text-sm" role="note">
          <strong>Development mode:</strong> no SMS provider is configured, so the code is shown here: <span className="font-mono tracking-widest">{sent.devCode}</span>
        </p>
      )}
      <form action={verify} className="space-y-3">
        <input type="hidden" name="phone" value={sent.phone ?? ""} />
        <input type="hidden" name="mode" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}
        <label htmlFor="otp-code" className="sr-only">Verification code</label>
        <input
          id="otp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="field text-center font-mono text-2xl tracking-[0.5em]"
          aria-invalid={!!checked.error}
        />
        {checked.error && <p className="text-sm text-sale" role="alert">{checked.error}</p>}
        <button className="btn btn-primary w-full" disabled={verifying}>{verifying ? "Checking…" : mode === "link" ? "Verify number" : "Sign in"}</button>
      </form>
      <form action={send}>
        <input type="hidden" name="phone" value={sent.phone ?? ""} />
        <button className="text-sm underline disabled:text-muted disabled:no-underline" disabled={left > 0 || sending}>
          {left > 0 ? `Resend code in ${left}s` : "Resend code"}
        </button>
        {sent.error && step === "code" && <span className="ms-2 text-sm text-sale">{sent.error}</span>}
      </form>
    </div>
  );
}
