import Link from 'next/link';

type Props = {
  loginLabel: string;
  ctaLabel: string;
};

export function Navbar({ loginLabel, ctaLabel }: Props) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center text-xl font-extrabold">
          <span className="text-primary">Cambia</span>
          <span className="text-accent">La</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            {loginLabel}
          </Link>
          <Link
            href="/auth/login"
            className="bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-accent/20 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:shadow-md"
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
