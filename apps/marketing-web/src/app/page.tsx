import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Gauge, Layers, Microscope, Satellite } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { modules, projectStats } from "@/lib/site-data";

const moduleIcons = {
  f1: Gauge,
  f2: Satellite,
  f3: Layers,
  f4: Microscope,
};

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="hero-cover relative min-h-[74svh] border-b border-[color:var(--line)] text-white">
          <div className="mx-auto flex max-w-7xl flex-col justify-end px-4 py-16 sm:px-6 lg:px-8">
            <p className="max-w-xl text-sm font-semibold uppercase text-white/82">
              4th year Software Engineering research project
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight sm:text-6xl">
              Adaptive Smart Irrigation and Crop Optimization Platform
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/82 sm:text-lg">
              An integrated decision-support system for Sri Lankan irrigation schemes,
              combining IoT sensing, crop health analytics, water forecasting, and adaptive
              crop area planning under fixed water quotas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/domain"
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--soft)]"
              >
                Explore Domain
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 rounded-md border border-white/60 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                <FileText size={17} aria-hidden="true" />
                View Documents
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--line)] bg-[color:var(--surface)]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {projectStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[color:var(--line)] p-4">
                <p className="text-3xl font-semibold text-[color:var(--ink)]">{stat.value}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Project architecture</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Four research streams feeding one water-aware decision loop.
              </h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                The platform is more than a dashboard. Each service provides a decision
                signal that improves another service: stress influences irrigation,
                forecasts influence optimization, and field telemetry keeps the whole plan grounded.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {modules.map((module) => {
                const Icon = moduleIcons[module.id as keyof typeof moduleIcons];
                return (
                  <article key={module.id} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                    <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-md bg-[color:var(--soft)] accent-${module.accent}`}>
                      <Icon size={22} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--muted)]">
                      {module.shortName} - {module.owner}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">{module.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{module.summary}</p>
                    <ul className="mt-5 grid gap-2 text-sm text-[color:var(--ink)]">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--green)]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="band-grid border-y border-[color:var(--line)] bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--water)]">Evidence first</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  The visuals come from the project research assets.
                </h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The marketing site uses generated research outputs from the repo: zone
                  health maps, ensemble forecasts, optimization architecture, and actuation
                  pipelines. This keeps the website tied to the actual system.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {modules.map((module) => (
                  <figure key={module.id} className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-white">
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={module.image}
                        alt={module.imageAlt}
                        width={1200}
                        height={720}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <figcaption className="border-t border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--muted)]">
                      {module.shortName}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Website structure</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Built around the course website criteria.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Home", "Abstract-level introduction and project highlights"],
                ["Domain", "Literature, gap, problem, objectives, methodology, technology"],
                ["Milestones", "Assessment selector with dates, marks, and details"],
                ["Documents", "Document links prepared for final submissions"],
                ["Slides", "Past and upcoming presentation deck links"],
                ["About and Contact", "Team profiles, emails, and contact form"],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-lg border border-[color:var(--line)] bg-white p-4">
                  <h3 className="font-semibold text-[color:var(--ink)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
