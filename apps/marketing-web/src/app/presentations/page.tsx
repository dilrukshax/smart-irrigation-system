import { Presentation, ScreenShare } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { presentations } from "@/lib/site-data";

export default function PresentationsPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Presentations"
          title="Presentation slides"
          lead="Past and future presentation decks for the proposal, progress reviews, final assessment, and individual research streams."
          image="/assets/research/fig13_ensemble_forecast.png"
        />
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8">
            {presentations.map((group) => (
              <section key={group.category}>
                <div className="mb-4 flex items-center gap-3">
                  <Presentation size={22} className="text-[color:var(--water)]" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold">{group.category}</h2>
                </div>
                <div className="grid gap-3">
                  {group.items.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      className="grid gap-4 rounded-lg border border-[color:var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--water)] sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <span>
                        <span className="block text-base font-semibold text-[color:var(--ink)]">{item.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-[color:var(--muted)]">{item.description}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-md bg-[color:var(--soft)] px-3 py-2 text-sm font-semibold text-[color:var(--ink)]">
                        <ScreenShare size={16} aria-hidden="true" />
                        {item.status}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
