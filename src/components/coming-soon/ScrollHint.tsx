'use client';

type Props = {
  /** id del elemento al que scrollear (sin #) */
  targetId: string;
  label: string;
};

export function ScrollHint({ targetId, label }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="group border-accent/30 bg-accent/5 text-accent hover:border-accent/60 hover:bg-accent/10 absolute bottom-10 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-all"
    >
      <span>{label}</span>
      <svg
        className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </a>
  );
}
