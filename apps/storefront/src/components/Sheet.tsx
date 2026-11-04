"use client";

import { useEffect, useRef } from "react";

// Open sheets share one scroll lock, so closing one never unlocks the page under another.
let locks = 0;
function lockScroll() {
  if (locks++ === 0) document.body.style.overflow = "hidden";
  return () => {
    if (--locks === 0) document.body.style.overflow = "";
  };
}

/**
 * Animated overlay panel (menu, bag, filters, search). It stays mounted so it can
 * slide out as smoothly as it slides in; while closed it is invisible and inert.
 * Motion lives in globals.css under `.sheet`.
 */
export function Sheet({
  open,
  onClose,
  label,
  side,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  side: "start" | "end" | "top";
  className?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the open effect (callers pass inline arrows)
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const returnTo = document.activeElement as HTMLElement | null;
    // Children may focus their own field first (search); otherwise focus the panel
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className="sheet fixed inset-0 z-50" data-open={open || undefined} inert={!open} role="dialog" aria-modal="true" aria-label={label}>
      <button className="sheet-backdrop absolute inset-0 bg-ink/40" aria-label={`Close ${label.toLowerCase()}`} tabIndex={-1} onClick={() => close.current()} />
      <div ref={panel} tabIndex={-1} className={`sheet-panel sheet-${side} outline-none ${className}`}>
        {children}
      </div>
    </div>
  );
}
