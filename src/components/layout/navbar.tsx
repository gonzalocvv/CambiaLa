import Link from 'next/link';

type Props = {
  loginLabel: string;
  ctaLabel: string;
};

export function Navbar({ loginLabel, ctaLabel }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center text-xl font-extrabold">
          <span className="text-white">Cambia</span>
          <span className="text-orange-500">La</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            {loginLabel}
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-400 hover:shadow-md hover:shadow-orange-500/20"
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
