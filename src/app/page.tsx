import { ScrollHint } from '@/components/coming-soon/ScrollHint';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-slate-950 text-white">
      {/* Hero */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl space-y-8 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight md:text-8xl">
            Cambia<span className="text-orange-500">La</span>
          </h1>

          <p className="text-2xl font-light text-slate-300 md:text-3xl">
            Cambiá las figuritas del Mundial 2026, sin caos.
          </p>

          <div className="inline-block">
            <span className="inline-flex items-center rounded-full bg-orange-500/10 px-6 py-3 text-base font-medium text-orange-400 ring-1 ring-inset ring-orange-500/30">
              🇺🇾 Próximamente
            </span>
          </div>

          <p className="pt-8 text-sm text-slate-500">
            Plataforma para coleccionistas uruguayos del Mundial 2026.
            <br />
            Cargá tu álbum, te avisamos cuando aparece alguien para cambiar.
          </p>
        </div>

        {/* Scroll hint — client component, scroll programático */}
        <ScrollHint targetId="como-funciona" label="¿Cómo funciona?" />
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="relative scroll-mt-8 border-t border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 px-6 py-28"
      >
        {/* Glow decorativo arriba */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -translate-y-1/2 mx-auto h-32 w-32 rounded-full bg-orange-500/20 blur-3xl md:w-64"
        />

        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Paso a paso
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              ¿Cómo funciona?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 md:text-lg">
              En tres pasos. Sin chat caótico, sin Marketplace, sin spam.
            </p>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8">
            {/* Paso 1 */}
            <div className="group relative rounded-2xl border border-orange-500/20 bg-slate-900/60 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110">
                1
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-white">Cargá tu álbum</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Marcá qué figuritas tenés, cuáles te faltan y cuáles repetidas podés cambiar.
                Tarda 5 minutos.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="group relative rounded-2xl border border-orange-500/20 bg-slate-900/60 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110">
                2
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-white">Buscamos tu match</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Cruzamos tu álbum con el de otros coleccionistas de tu barrio o ciudad. Vos
                elegís hasta dónde compartir tu ubicación.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="group relative rounded-2xl border border-orange-500/20 bg-slate-900/60 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110">
                3
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-white">Cambiá y completá</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Te avisamos por mail cuando aparece un match. Coordinás por chat y arreglás
                cuándo y dónde encontrarse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8 text-center text-xs text-slate-600">
        Hecho con <span className="text-orange-500">♥</span> en Uruguay
      </footer>
    </div>
  );
}
