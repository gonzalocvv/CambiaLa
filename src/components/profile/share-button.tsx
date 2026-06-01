'use client';

import { useState } from 'react';

type Props = {
  label: string;
  copiedLabel: string;
};

export function ShareButton({ label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
      type="button"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
