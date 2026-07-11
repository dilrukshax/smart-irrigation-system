import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Gauge, Layers, Microscope, Satellite, Sparkles, Workflow, Zap } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { modules, projectStats, researchEvidence, problemsOvercome, technicalDetails } from "@/content/site-data";


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
                style={{ color: "var(--ink)" }}
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

        <section className="bg-[color:var(--paper)] border-b border-[color:var(--line)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--green)] ring-1 ring-[color:var(--line)]">
                <Zap size={14} aria-hidden="true" />
                <span>Challenges Resolved</span>
              </div>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl text-[color:var(--ink)]">
                Overcoming fragmentation and water waste in irrigation schemes.
              </h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                ASICOP replaces manual, static schedules and isolated agricultural tools with an end-to-end integrated solution. Here is how we resolve key domain inefficiencies:
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {problemsOvercome.map((item) => (
                <div key={item.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5 flex flex-col justify-between transition hover:-translate-y-0.5 hover:border-[color:var(--green)]">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--ink)] leading-snug">{item.title}</h3>
                    <div className="mt-3 rounded-md bg-stone-50/50 p-3 border border-dashed border-stone-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">The Problem</p>
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">{item.problem}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-md bg-[color:var(--soft)] p-3 border border-[color:var(--line)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--green)]">The Resolution</p>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--ink)] font-medium">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-16 sm:px-6 lg:px-8 border-b border-[color:var(--line)]">

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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {module.metrics.map((metric) => (
                        <span key={metric} className="rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)]">
                          {metric}
                        </span>
                      ))}
                    </div>
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

        <section className="bg-white border-b border-[color:var(--line)] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--green)] ring-1 ring-[color:var(--line)]">
                  <Workflow size={14} aria-hidden="true" />
                  <span>Closed-Loop Architecture</span>
                </div>
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl text-[color:var(--ink)]">
                  The technical idea: dynamic service co-operation.
                </h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  Traditional research trains models in isolation. ASICOP connects models at runtime: forecasts alter valve schedules, crop stress penalizes area suitability, and remaining water quotas drive optimization.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4 transition hover:border-[color:var(--green)]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--water)] text-xs font-bold text-white">
                      F3→F1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">Rainfall suppression</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted)]">Expected rain of &ge;5mm within 24h triggers valve closure advice, saving reservoir storage.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4 transition hover:border-[color:var(--green)]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--green)] text-xs font-bold text-white">
                      F2→F1 & F4
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">Stress priority & suitability penalty</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted)]">Severe field stress escalates valve priority, while repeated stress acts as a penalty weight in crop suitability planning.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4 transition hover:border-[color:var(--green)]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--harvest)] text-xs font-bold text-white">
                      F1→F4
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">Water budget feedback</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted)]">Live remaining water quotas act as hard mathematical constraints in the mixed-integer optimization solver.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--green)] ring-1 ring-[color:var(--line)]">
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Model Specifications</span>
                </div>
                <h3 className="text-xl font-semibold text-[color:var(--ink)] mb-6">Algorithm & Dataset Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {technicalDetails.map((detail) => (
                    <article key={detail.name} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-5 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-[color:var(--ink)]">{detail.name}</h4>
                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Algorithm / Method</p>
                            <p className="text-xs font-medium text-[color:var(--ink)] mt-0.5">{detail.algorithm}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Dataset / Scope</p>
                            <p className="text-xs font-medium text-[color:var(--ink)] mt-0.5">{detail.dataset}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Performance Metric</p>
                            <p className="text-xs font-bold text-[color:var(--green)] mt-0.5">{detail.metric}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[color:var(--line)]">
                        <p className="text-[10px] uppercase font-bold text-[color:var(--muted)] tracking-wider">Field Impact</p>
                        <p className="text-xs font-medium text-[color:var(--ink)] mt-0.5">{detail.impact}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="band-grid border-b border-[color:var(--line)] bg-white px-4 py-16 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--water)]">Evidence first</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  The visuals come from the project research assets.
                </h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The project evidence is grounded in generated research outputs from the repo:
                  hydrology records, NDVI health maps, ensemble forecasts, price modelling, and
                  crop allocation architecture.
                </p>
                <div className="mt-6 grid gap-3">
                  {researchEvidence.map((item) => (
                    <div key={`${item.stream}-${item.metric}`} className="rounded-lg border border-[color:var(--line)] bg-white p-4">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">
                        {item.stream} - {item.value}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{item.metric}</p>
                    </div>
                  ))}
                </div>
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
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Submission structure</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Research material organized for evaluation.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Abstract", "Integrated project overview and research highlights"],
                ["Domain", "Literature, gap, problem, objectives, methodology, and technologies"],
                ["Milestones", "Assessment timeline with dates and details"],
                ["Documents", "Project-wide and individual final submission files"],
                ["Slides", "Proposal, progress, final, and stream deep-dive decks"],
                ["Team", "Member profiles, stream ownership, and contact details"],
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
