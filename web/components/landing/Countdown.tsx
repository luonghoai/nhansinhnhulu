"use client";

import { useEffect, useState } from "react";

function getRemaining(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: diff === 0,
  };
}

export function Countdown({ startAt }: { startAt: string }) {
  const targetMs = new Date(startAt).getTime();
  const [remaining, setRemaining] = useState(() => getRemaining(targetMs));

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getRemaining(targetMs)), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  if (remaining.done) {
    return <span aria-live="polite">Starting soon</span>;
  }

  return (
    <span aria-live="polite" className="font-mono tabular-nums text-jade">
      {remaining.days > 0 && `${remaining.days}d `}
      {String(remaining.hours).padStart(2, "0")}:
      {String(remaining.minutes).padStart(2, "0")}:
      {String(remaining.seconds).padStart(2, "0")}
    </span>
  );
}
