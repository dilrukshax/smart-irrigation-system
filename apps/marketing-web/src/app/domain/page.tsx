import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  FlaskConical,
  Layers3,
  Network,
  Workflow,
  Check,
  CpuIcon
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ResearchImage } from "@/components/research-image";
import { SiteShell } from "@/components/site-shell";
import { InView } from "@/components/in-view";
import {
  domainDetails,
  integrationSignals,
  limitationsAndFutureWork,
  literaturePoints,
  methodologyPhases,
  modules,
  researchEvidence,
  researchObjectives,
  streamDeepDives,
  technologyGroups,
} from "@/content/site-data";

export default function DomainPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Research Scope"
          title="Domain & technical foundation"
          lead="ASICOP covers quota-based irrigation operations where reservoir storage, canal flows, satellite crop stress, weather risk, and seasonal economics shape a unified decision loop."
          image="/assets/illustrations/hero-domain-network.png"
        />

        {/* WHY THIS DOMAIN MATTERS */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[color:var(--paper)]">
          <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <InView className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Literature Survey
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                Why this domain matters
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                Smart irrigation is not only a sensor problem. In a canal-command area, every
                field decision must respect reservoir storage, canal releases, weather risk,
                crop stress, market value, and authority-level water policy.
              </p>
            </InView>
            
            <div className="grid gap-4">
              {literaturePoints.map((point, idx) => (
                <InView
                  key={point}
                  delay={idx * 100}
                  className="glass-card rounded-2xl p-5 border bg-white flex items-start gap-4 transition hover:shadow-md duration-200"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-[color:var(--green)] mt-0.5">
                    <Check size={12} className="stroke-[3]" />
                  </span>
                  <p className="text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                    {point}
                  </p>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* GAP AND PROBLEM STATEMENT */}
        <section className="border-y border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <InView
                delay={0}
                className="glass-card rounded-3xl p-6 sm:p-8 border hover:border-[color:var(--clay)] hover:shadow-xl transition-all duration-300 group"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-[color:var(--clay)] group-hover:scale-105 transition-transform duration-300">
                  <FlaskConical size={24} className="fill-current/5" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[color:var(--ink)]">
                  Research gap
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                  Existing systems usually optimize only one layer: IoT valve control, crop
                  stress detection, reservoir forecasting, or crop planning. The gap is an
                  integrated decision platform where those signals change one another before
                  the farmer or officer acts.
                </p>
              </InView>

              <InView
                delay={150}
                className="glass-card rounded-3xl p-6 sm:p-8 border hover:border-[color:var(--water)] hover:shadow-xl transition-all duration-300 group"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-sky-500/10 text-[color:var(--water)] group-hover:scale-105 transition-transform duration-300">
                  <Workflow size={24} />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[color:var(--ink)]">
                  Research problem
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                  How can IoT telemetry, crop health analytics, water forecasting, and crop-area
                  optimization be integrated to reduce water waste and improve crop planning
                  under fixed irrigation quotas in Sri Lankan schemes?
                </p>
              </InView>
            </div>
          </div>
        </section>

        {/* DOMAIN-SPECIFIC SCOPE */}
        <section className="bg-[color:var(--paper)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-12">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Domain-specific scope
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                Four domain layers behind the platform
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium mt-3">
                The project scope combines agricultural, hydrological, remote-sensing, and
                economic context from the documented research material.
              </p>
            </InView>

            <div className="grid gap-6 md:grid-cols-2">
              {domainDetails.map((item, idx) => (
                <InView
                  key={item.title}
                  delay={idx * 100}
                  className="glass-card rounded-3xl p-6 sm:p-8 border bg-white flex flex-col justify-between hover:border-[color:var(--green)] hover:shadow-lg transition-all duration-300"
                >
                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-[color:var(--ink)]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                      {item.detail}
                    </p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-[color:var(--soft)] border border-[color:var(--line)] px-4 py-3 text-xs font-bold leading-relaxed text-[color:var(--ink)] shadow-sm">
                    <span className="text-[10px] uppercase text-[color:var(--focus)] block mb-1 tracking-widest">
                      Platform Evidence
                    </span>
                    {item.evidence}
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* OBJECTIVES */}
        <section className="border-y border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-12">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Objectives
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Main & specific objectives
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium mt-3">
                The main objective is to design, implement, and validate an integrated smart
                irrigation and crop optimization platform for water-constrained agriculture.
              </p>
            </InView>

            <div className="grid gap-6 md:grid-cols-2">
              {researchObjectives.map((objective, idx) => (
                <InView
                  key={objective.title}
                  delay={idx * 100}
                  className="glass-card rounded-3xl p-6 border bg-[color:var(--paper)] flex gap-4 transition hover:shadow-md duration-300"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-[color:var(--green)]">
                    <CheckCircle2 size={20} />
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[color:var(--ink)]">
                      {objective.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                      {objective.detail}
                    </p>
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* METHODOLOGY SECTION */}
        <section className="bg-[color:var(--paper)] px-4 py-20 sm:px-6 lg:px-8 border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
              <InView className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--water)]">
                    Methodology
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                    From domain research to integrated prototype
                  </h2>
                  <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                    Our methodology follows a clean research-to-system path: define the water-management
                    problem, engineer stream-specific datasets, train suitable ML models, and integrate
                    their outputs through service contracts and decision rules.
                  </p>
                </div>

                <div className="rounded-3xl border border-[color:var(--line)] bg-white p-3 shadow-md">
                  <ResearchImage
                    src="/assets/research/fig14_system_architecture.png"
                    alt="System architecture diagram"
                    caption="Integrated architecture showing gateway routing, research services, data stores, telemetry, and observability."
                    width={2385}
                    height={1184}
                  />
                </div>
              </InView>

              <ol className="grid gap-4">
                {methodologyPhases.map((phase, index) => (
                  <InView
                    key={phase.title}
                    delay={index * 100}
                    className="glass-card rounded-2xl p-5 border bg-white shadow-sm hover:border-[color:var(--green)] hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] text-sm font-black text-white shadow-md shadow-emerald-950/15">
                        {index + 1}
                      </span>
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-[color:var(--ink)] text-base">
                          {phase.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                          {phase.detail}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[color:var(--line)] flex flex-wrap gap-2">
                      {phase.outputs.map((output) => (
                        <span
                          key={output}
                          className="rounded-full bg-[color:var(--soft)] border border-[color:var(--line)] px-3 py-1 text-[10px] font-bold text-[color:var(--ink)]"
                        >
                          {output}
                        </span>
                      ))}
                    </div>
                  </InView>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* STREAM DEEP DIVES */}
        <section className="border-b border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-12">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Research stream detail
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                What each module actually contributes
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium mt-3">
                Each stream owns a different domain problem, dataset, model family, evaluation
                result, and integration contract inside the full platform.
              </p>
            </InView>

            <div className="grid gap-6 lg:grid-cols-2">
              {streamDeepDives.map((stream, idx) => (
                <InView
                  key={stream.id}
                  delay={idx * 150}
                  className="glass-card rounded-3xl p-6 sm:p-8 border bg-[color:var(--paper)] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="size-3.5 rounded-full bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] shrink-0" />
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--muted)]">
                          {stream.label}
                        </p>
                        <h3 className="text-xl font-extrabold text-[color:var(--ink)]">
                          {stream.domain}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="mt-5 space-y-3.5 text-xs font-semibold leading-relaxed text-[color:var(--muted)]">
                      <p>
                        <span className="font-extrabold text-[color:var(--ink)] block text-[10px] uppercase tracking-wider mb-0.5">Dataset:</span>
                        {stream.dataset}
                      </p>
                      <p>
                        <span className="font-extrabold text-[color:var(--ink)] block text-[10px] uppercase tracking-wider mb-0.5">Method:</span>
                        {stream.method}
                      </p>
                      <p>
                        <span className="font-extrabold text-[color:var(--ink)] block text-[10px] uppercase tracking-wider mb-0.5">Evaluation:</span>
                        {stream.evaluation}
                      </p>
                      <p>
                        <span className="font-extrabold text-[color:var(--ink)] block text-[10px] uppercase tracking-wider mb-0.5">Integration:</span>
                        {stream.integration}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[color:var(--line)] rounded-2xl bg-white px-4 py-3.5 text-xs font-bold leading-relaxed text-[color:var(--ink)] border shadow-sm">
                    <span className="text-[10px] uppercase text-[color:var(--focus)] block mb-1 tracking-widest">
                      Known Limitation / Future Work
                    </span>
                    {stream.caveat}
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* EVIDENCE AND METRICS */}
        <section className="bg-[color:var(--paper)] px-4 py-20 sm:px-6 lg:px-8 border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <InView className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--water)]">
                  Evidence and metrics
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Research results kept visible
                </h2>
                <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                  The site presents results from the documented notebooks and service research,
                  including limitations where the evidence is still maturing.
                </p>
              </InView>

              <div className="grid gap-4 sm:grid-cols-2">
                {researchEvidence.map((item, idx) => (
                  <InView
                    key={`${item.stream}-${item.metric}`}
                    delay={idx * 100}
                    className="glass-card rounded-3xl p-6 border bg-white hover:border-[color:var(--green)] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-[color:var(--green)]" size={18} />
                      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
                        {item.stream} - {item.metric}
                      </p>
                    </div>
                    <p className="mt-4 text-3xl font-extrabold bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] bg-clip-text text-transparent">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                      {item.detail}
                    </p>
                  </InView>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CROSS-SERVICE LOOP */}
        <section className="border-b border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
              <InView className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                  Cross-service loop
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  How one stream changes another
                </h2>
                <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                  The core research contribution is the integration layer. Predictions become
                  operational signals that affect irrigation, crop ranking, water budgeting, and
                  mid-season Plan B decisions.
                </p>
              </InView>

              <div className="grid gap-4">
                {integrationSignals.map((item, idx) => (
                  <InView
                    key={`${item.from}-${item.to}-${item.signal}`}
                    delay={idx * 100}
                    className="glass-card rounded-2xl p-5 border bg-[color:var(--paper)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition hover:shadow-md duration-300"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[color:var(--ink)]">
                        <span>{item.from}</span>
                        <ArrowRightLeft size={14} className="text-[color:var(--water)]" />
                        <span>{item.to}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                        {item.use}
                      </p>
                    </div>
                    <span className="rounded-full bg-white border border-[color:var(--line)] px-3 py-1 text-[10px] font-extrabold text-[color:var(--focus)] uppercase tracking-wider whitespace-nowrap shadow-sm">
                      {item.signal}
                    </span>
                  </InView>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TECHNOLOGIES STACK GROUPS */}
        <section className="bg-[color:var(--paper)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <InView className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--water)]">
                  Technologies used
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                  A production-style research stack
                </h2>
                <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                  The implementation combines web engineering, IoT communication, geospatial
                  analysis, machine learning, optimization, and deployment infrastructure.
                </p>
              </InView>

              <div className="grid gap-6 sm:grid-cols-2">
                {technologyGroups.map((group, idx) => (
                  <InView
                    key={group.title}
                    delay={idx * 100}
                    className="glass-card rounded-3xl p-6 border bg-white flex flex-col justify-between hover:border-[color:var(--green)] hover:shadow-lg transition-all duration-300"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-[color:var(--soft)] text-[color:var(--focus)]">
                          {group.title.includes("Data") ? (
                            <Database size={18} />
                          ) : group.title.includes("Remote") ? (
                            <Layers3 size={18} />
                          ) : group.title.includes("IoT") ? (
                            <Network size={18} />
                          ) : (
                            <CpuIcon size={18} />
                          )}
                        </span>
                        <h3 className="font-extrabold text-[color:var(--ink)] text-base">
                          {group.title}
                        </h3>
                      </div>
                      <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                        {group.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[color:var(--line)] flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-[color:var(--soft)] border border-[color:var(--line)] px-2.5 py-0.5 text-[9px] font-bold text-[color:var(--ink)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </InView>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* LIMITATIONS ROADMAP */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <InView className="space-y-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-[color:var(--clay)]">
                <AlertTriangle size={24} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--clay)]">
                Limitations & future work
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                A transparent research roadmap
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--muted)] font-medium">
                The project documents where the current prototype is strong, and where additional
                field evidence, data cleaning, or solver maturity is still required.
              </p>
            </InView>

            <div className="grid gap-3">
              {limitationsAndFutureWork.map((item, idx) => (
                <InView
                  key={item}
                  delay={idx * 100}
                  className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5 flex items-start gap-4 transition duration-200"
                >
                  <span className="grid size-2 shrink-0 rounded-full bg-[color:var(--clay)] mt-2" />
                  <p className="text-sm leading-relaxed text-rose-900 font-semibold">
                    {item}
                  </p>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICE PORT ROLES INDEX */}
        <section className="bg-[color:var(--paper)] border-t border-[color:var(--line)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Service ownership
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[color:var(--ink)]">
                API gateway service routing ports
              </h2>
            </InView>

            <div className="grid gap-6 md:grid-cols-2">
              {modules.map((module, idx) => (
                <InView
                  key={module.id}
                  delay={idx * 100}
                  className="glass-card rounded-3xl p-6 border bg-white hover:border-[color:var(--green)] hover:shadow-md transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-extrabold text-[color:var(--focus)] uppercase tracking-widest">
                        {module.service}
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-[color:var(--ink)]">
                        {module.shortName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[color:var(--soft)] border border-[color:var(--line)] px-3 py-1 text-xs font-bold text-[color:var(--ink)]">
                      Port: {module.port}
                    </span>
                  </div>
                  
                  <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold mb-4">
                    {module.summary}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {module.metrics.map((metric) => (
                      <span key={metric} className="rounded-full bg-stone-50 border border-stone-200 px-3.5 py-1 text-[10px] font-bold text-stone-600">
                        {metric}
                      </span>
                    ))}
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
