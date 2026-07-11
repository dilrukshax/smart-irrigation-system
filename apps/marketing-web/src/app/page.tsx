import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Gauge, Layers, Microscope, Satellite, Sparkles, Workflow, Zap, Database, CheckCircle2 } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { InView } from "@/components/in-view";
import { modules, projectStats, researchEvidence, problemsOvercome, technicalDetails } from "@/content/site-data";

const moduleIcons = {
  f1: Gauge,
  f2: Satellite,
  f3: Layers,
  f4: Microscope,
};

const moduleColors = {
  f1: {
    bg: "bg-sky-500/10",
    text: "text-sky-600",
    border: "hover:border-sky-500/30",
    glow: "shadow-sky-500/5",
  },
  f2: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    border: "hover:border-emerald-500/30",
    glow: "shadow-emerald-500/5",
  },
  f3: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600",
    border: "hover:border-indigo-500/30",
    glow: "shadow-indigo-500/5",
  },
  f4: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    border: "hover:border-amber-500/30",
    glow: "shadow-amber-500/5",
  },
};

export default function HomePage() {
  return (
    <SiteShell>
      <main>
        {/* HERO SECTION */}
        <section className="hero-cover relative min-h-[80svh] flex items-center border-b border-[color:var(--line)] text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(28,124,84,0.15),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 z-10">
            <InView className="max-w-4xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-emerald-400 backdrop-blur-md">
                <Sparkles size={13} className="fill-emerald-400/20" />
                <span>4th Year Software Engineering Research Project</span>
              </div>
              
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Adaptive Smart Irrigation & <br/>
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                  Crop Optimization Platform
                </span>
              </h1>
              
              <p className="max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl font-medium">
                An integrated decision-support system for Sri Lankan irrigation schemes,
                combining IoT telemetry, remote-sensing crop health, rainfall forecasting,
                and resource-constrained agricultural optimization.
              </p>
              
              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  href="/domain"
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-4 text-sm font-bold text-[color:var(--ink)] shadow-lg hover:bg-emerald-50 hover:scale-103 active:scale-98 transition-all duration-200"
                >
                  Explore Research Domain
                  <ArrowRight size={17} className="text-[color:var(--green)]" />
                </Link>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm px-6 py-4 text-sm font-bold text-white hover:bg-white/10 hover:border-white/50 hover:scale-103 active:scale-98 transition-all duration-200"
                >
                  <FileText size={17} />
                  Submission Archive
                </Link>
              </div>
            </InView>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="relative -mt-10 border-b border-[color:var(--line)] bg-transparent z-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
              {projectStats.map((stat, idx) => (
                <InView key={stat.label} delay={idx * 100} className="glass-card rounded-2xl p-6 shadow-xl shadow-[color:var(--ink)]/5 transition hover:-translate-y-1 duration-300">
                  <p className="text-4xl font-extrabold bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] bg-clip-text text-transparent leading-none">
                    {stat.value}
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
                    {stat.label}
                  </p>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEMS & SOLUTIONS */}
        <section className="bg-[color:var(--paper)] border-b border-[color:var(--line)] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <InView className="max-w-3xl mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--soft)] px-4 py-1.5 text-xs font-bold text-[color:var(--green)] border border-[color:var(--line)]">
                <Zap size={14} className="fill-[color:var(--green)]/10" />
                <span>Challenges Resolved</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-[color:var(--ink)]">
                Overcoming fragmentation and water waste in irrigation schemes.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[color:var(--muted)] font-medium">
                ASICOP replaces manual, static schedules and isolated agricultural tools with an end-to-end integrated solution. Here is how we resolve key domain inefficiencies:
              </p>
            </InView>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {problemsOvercome.map((item, idx) => (
                <InView key={item.title} delay={idx * 100} className="glass-card rounded-3xl p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl hover:border-[color:var(--green)] duration-300 group">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[color:var(--ink)] leading-snug group-hover:text-[color:var(--focus)] transition-colors">
                      {item.title}
                    </h3>
                    
                    <div className="rounded-2xl bg-amber-500/5 p-4 border border-dashed border-amber-500/10">
                      <span className="inline-block px-2 py-0.5 mb-2 rounded-md bg-amber-500/10 text-[9px] font-extrabold uppercase tracking-widest text-amber-700">
                        The Problem
                      </span>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                        {item.problem}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/10">
                    <span className="inline-block px-2 py-0.5 mb-2 rounded-md bg-emerald-500/10 text-[9px] font-extrabold uppercase tracking-widest text-emerald-700">
                      The Resolution
                    </span>
                    <p className="text-xs leading-relaxed text-[color:var(--ink)] font-bold">
                      {item.solution}
                    </p>
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* RESEARCH STREAMS / MODULES */}
        <section className="bg-white border-b border-[color:var(--line)] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <InView className="max-w-3xl mb-16 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">Project Architecture</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Four research streams feeding one water-aware decision loop.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[color:var(--muted)] font-medium">
                The platform is more than a dashboard. Each service provides a decision
                signal that improves another service: stress influences irrigation,
                forecasts influence optimization, and field telemetry keeps the whole plan grounded.
              </p>
            </InView>

            <div className="grid gap-6 md:grid-cols-2">
              {modules.map((module, idx) => {
                const Icon = moduleIcons[module.id as keyof typeof moduleIcons];
                const color = moduleColors[module.id as keyof typeof moduleColors] ?? moduleColors.f1;
                return (
                  <InView key={module.id} delay={idx * 150} className={`glass-card rounded-3xl p-6 border transition-all hover:shadow-xl ${color.border} duration-300 group`}>
                    <div className="flex items-start gap-4">
                      <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${color.bg} ${color.text} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={24} className="fill-current/5" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
                          {module.shortName} • {module.owner}
                        </p>
                        <h3 className="text-xl font-bold text-[color:var(--ink)] group-hover:text-[color:var(--focus)] transition-colors">
                          {module.name}
                        </h3>
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-relaxed text-[color:var(--muted)] font-medium">
                      {module.summary}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {module.metrics.map((metric) => (
                        <span key={metric} className="rounded-full bg-[color:var(--soft)] border border-[color:var(--line)] px-3.5 py-1 text-xs font-bold text-[color:var(--ink)] shadow-sm">
                          {metric}
                        </span>
                      ))}
                    </div>

                    <ul className="mt-6 pt-6 border-t border-[color:var(--line)] space-y-3.5 text-sm text-[color:var(--ink)] font-bold">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2.5 items-start">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[color:var(--green)]" />
                          <span className="leading-relaxed font-semibold">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </InView>
                );
              })}
            </div>
          </div>
        </section>

        {/* CLOSED-LOOP SYSTEM ARCHITECTURE */}
        <section className="bg-[color:var(--paper)] border-b border-[color:var(--line)] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
              <InView className="space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--soft)] px-4 py-1.5 text-xs font-bold text-[color:var(--green)] border border-[color:var(--line)]">
                    <Workflow size={14} />
                    <span>Closed-Loop Architecture</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-[color:var(--ink)]">
                    The technical idea: dynamic service co-operation.
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[color:var(--muted)] font-medium">
                    Traditional research trains models in isolation. ASICOP connects models at runtime: forecasts alter valve schedules, crop stress penalizes area suitability, and remaining water quotas drive optimization.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 rounded-2xl border border-[color:var(--line)] bg-white p-5 transition hover:border-[color:var(--green)] hover:shadow-lg duration-300">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-xs font-extrabold text-white shadow-md">
                      F3→F1
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[color:var(--ink)]">Rainfall suppression</p>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-medium">Expected rain of &ge;5mm within 24h triggers valve closure advice, saving reservoir storage.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 rounded-2xl border border-[color:var(--line)] bg-white p-5 transition hover:border-[color:var(--green)] hover:shadow-lg duration-300">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-extrabold text-white shadow-md">
                      F2→F1 & F4
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[color:var(--ink)]">Stress priority & suitability penalty</p>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-medium">Severe field stress escalates valve priority, while repeated stress acts as a penalty weight in crop suitability planning.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 rounded-2xl border border-[color:var(--line)] bg-white p-5 transition hover:border-[color:var(--green)] hover:shadow-lg duration-300">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-extrabold text-white shadow-md">
                      F1→F4
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[color:var(--ink)]">Water budget feedback</p>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-medium">Live remaining water quotas act as hard mathematical constraints in the mixed-integer optimization solver.</p>
                    </div>
                  </div>
                </div>
              </InView>

              <InView className="space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--soft)] px-4 py-1.5 text-xs font-bold text-[color:var(--green)] border border-[color:var(--line)]">
                    <Sparkles size={14} />
                    <span>Model Specifications</span>
                  </div>
                  <h3 className="text-xl font-bold text-[color:var(--ink)]">Algorithm & Dataset Details</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {technicalDetails.map((detail) => (
                    <article key={detail.name} className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-[color:var(--focus)] transition-colors duration-300">
                      <div>
                        <h4 className="text-base font-bold text-[color:var(--ink)]">{detail.name}</h4>
                        <div className="mt-4 space-y-3.5">
                          <div>
                            <p className="text-[9px] uppercase font-extrabold text-[color:var(--muted)] tracking-widest">Algorithm / Method</p>
                            <p className="text-xs font-bold text-[color:var(--ink)] mt-0.5 leading-snug">{detail.algorithm}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-extrabold text-[color:var(--muted)] tracking-widest">Dataset / Scope</p>
                            <p className="text-xs font-bold text-[color:var(--ink)] mt-0.5 leading-snug">{detail.dataset}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-extrabold text-[color:var(--muted)] tracking-widest">Performance Metric</p>
                            <p className="text-xs font-extrabold text-[color:var(--green)] mt-0.5 leading-snug">{detail.metric}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 pt-3.5 border-t border-[color:var(--line)]">
                        <p className="text-[9px] uppercase font-extrabold text-[color:var(--muted)] tracking-widest">Field Impact</p>
                        <p className="text-xs font-bold text-[color:var(--ink)] mt-0.5 leading-snug">{detail.impact}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </InView>
            </div>
          </div>
        </section>

        {/* EVIDENCE FIRST SECTION */}
        <section className="bg-white border-b border-[color:var(--line)] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <InView className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--water)]">Evidence First</p>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                    The visuals come from the project research assets.
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-[color:var(--muted)] font-medium">
                    The project evidence is grounded in generated research outputs from the repo:
                    hydrology records, NDVI health maps, ensemble forecasts, price modelling, and
                    crop allocation architecture.
                  </p>
                </div>
                
                <div className="grid gap-3">
                  {researchEvidence.map((item) => (
                    <div key={`${item.stream}-${item.metric}`} className="rounded-2xl border border-[color:var(--line)] bg-transparent p-4 flex items-center justify-between transition-colors hover:bg-[color:var(--soft)]/30 duration-200">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-[color:var(--ink)]">
                          {item.stream} - {item.metric}
                        </p>
                        <p className="text-xs text-[color:var(--muted)] font-semibold">{item.detail}</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--soft)] border border-[color:var(--line)] px-4 py-1 text-xs font-extrabold text-[color:var(--focus)] whitespace-nowrap shadow-sm">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </InView>

              <InView className="grid gap-4 sm:grid-cols-2">
                {modules.map((module) => (
                  <figure key={module.id} className="overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                    <div className="relative aspect-[16/10] overflow-hidden bg-stone-50">
                      <Image
                        src={module.image}
                        alt={module.imageAlt}
                        width={1200}
                        height={720}
                        className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <figcaption className="border-t border-[color:var(--line)] bg-white px-4 py-2.5 text-xs font-bold text-[color:var(--muted)] uppercase tracking-wider">
                      {module.shortName}
                    </figcaption>
                  </figure>
                ))}
              </InView>
            </div>
          </div>
        </section>

        {/* ORGANIZER / DIRECTORY INDEX */}
        <section className="bg-[color:var(--paper)] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1fr]">
            <InView className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">Submission Structure</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Research material organized for evaluation.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[color:var(--muted)] font-medium">
                Our complete research logs, timeline milestones, slide decks, and final report drafts have been archived inside structured pages for departmental evaluation.
              </p>
            </InView>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Abstract", "Integrated project overview and research highlights", "/domain"],
                ["Domain", "Literature, gap, problem, objectives, methodology, and technologies", "/domain"],
                ["Milestones", "Assessment timeline with dates and details", "/milestones"],
                ["Documents", "Project-wide and individual final submission files", "/documents"],
                ["Slides", "Proposal, progress, final, and stream deep-dive decks", "/presentations"],
                ["Team", "Member profiles, stream ownership, and contact details", "/about"],
              ].map(([title, detail, link]) => (
                <Link
                  key={title}
                  href={link}
                  className="group block rounded-2xl border border-[color:var(--line)] bg-white p-5 hover:border-[color:var(--green)] hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="font-extrabold text-[color:var(--ink)] group-hover:text-[color:var(--focus)] transition-colors flex items-center justify-between gap-2">
                    {title}
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[color:var(--green)]" />
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                    {detail}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
