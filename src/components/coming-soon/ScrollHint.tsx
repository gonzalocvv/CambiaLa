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
      className="group absolute bottom-10 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/5 px-5 py-2.5 text-sm font-medium text-orange-300 transition-all hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-200"
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
