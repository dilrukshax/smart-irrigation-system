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
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ResearchImage } from "@/components/research-image";
import { SiteShell } from "@/components/site-shell";
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
          eyebrow="Domain"
          title="Research domain and technical foundation"
          lead="The platform targets quota-based Sri Lankan irrigation schemes where reservoir releases, field telemetry, crop stress, forecast risk, and seasonal crop allocation must work as one decision system."
          image="/assets/illustrations/hero-domain-network.png"
        />

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Literature survey</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Why this domain matters</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                Smart irrigation is not only a sensor problem. In a canal-command area, every
                field decision must respect reservoir storage, canal releases, weather risk,
                crop stress, market value, and authority-level water policy.
              </p>
            </div>
            <div className="grid gap-3">
              {literaturePoints.map((point) => (
                <article key={point} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <p className="text-sm leading-6 text-[color:var(--muted)]">{point}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-[color:var(--line)] p-6">
                <FlaskConical className="text-[color:var(--clay)]" size={28} aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-semibold">Research gap</h2>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  Existing systems usually optimize only one layer: IoT valve control, crop
                  stress detection, reservoir forecasting, or crop planning. The gap is an
                  integrated decision platform where those signals change one another before
                  the farmer or officer acts.
                </p>
              </article>
              <article className="rounded-lg border border-[color:var(--line)] p-6">
                <Workflow className="text-[color:var(--water)]" size={28} aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-semibold">Research problem</h2>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  How can IoT telemetry, crop health analytics, water forecasting, and crop-area
                  optimization be integrated to reduce water waste and improve crop planning
                  under fixed irrigation quotas in Sri Lankan schemes?
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Domain-specific scope</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Four domain layers behind the platform</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                The project scope combines agricultural, hydrological, remote-sensing, and
                economic context from the documented research material.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {domainDetails.map((item) => (
                <article key={item.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
                  <p className="mt-4 rounded-md bg-[color:var(--soft)] px-3 py-2 text-sm font-medium leading-6 text-[color:var(--ink)]">
                    {item.evidence}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Objectives</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Main and specific objectives</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                The main objective is to design, implement, and validate an integrated smart
                irrigation and crop optimization platform for water-constrained agriculture.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {researchObjectives.map((objective) => (
                <article key={objective.title} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-5">
                  <CheckCircle2 size={22} className="text-[color:var(--green)]" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold">{objective.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{objective.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-[color:var(--water)]">Methodology</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">From domain research to integrated prototype</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                The methodology follows a research-to-system path: define the water-management
                problem, engineer stream-specific datasets, train suitable models, then connect
                their outputs through service contracts and decision rules.
              </p>
              <ResearchImage
                src="/assets/research/fig14_system_architecture.png"
                alt="System architecture diagram"
                caption="Integrated architecture showing gateway routing, research services, data stores, telemetry, and observability."
                width={2385}
                height={1184}
              />
            </div>
            <ol className="grid gap-3">
              {methodologyPhases.map((phase, index) => (
                <li key={phase.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <div className="flex gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--ink)] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-[color:var(--ink)]">{phase.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{phase.detail}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {phase.outputs.map((output) => (
                      <span key={output} className="rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)]">
                        {output}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Research stream detail</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">What each module actually contributes</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                Each stream owns a different domain problem, dataset, model family, evaluation
                result, and integration contract inside the full platform.
              </p>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {streamDeepDives.map((stream) => (
                <article key={stream.id} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-5">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 size-3 rounded-full accent-${modules.find((module) => module.id === stream.id)?.accent ?? "leaf"} bg-current`} />
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--muted)]">{stream.label}</p>
                      <h3 className="mt-1 text-xl font-semibold">{stream.domain}</h3>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm leading-6 text-[color:var(--muted)]">
                    <p>
                      <span className="font-semibold text-[color:var(--ink)]">Dataset: </span>
                      {stream.dataset}
                    </p>
                    <p>
                      <span className="font-semibold text-[color:var(--ink)]">Method: </span>
                      {stream.method}
                    </p>
                    <p>
                      <span className="font-semibold text-[color:var(--ink)]">Evaluation: </span>
                      {stream.evaluation}
                    </p>
                    <p>
                      <span className="font-semibold text-[color:var(--ink)]">Integration: </span>
                      {stream.integration}
                    </p>
                    <p className="rounded-md bg-white px-3 py-2">
                      <span className="font-semibold text-[color:var(--ink)]">Future work: </span>
                      {stream.caveat}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--water)]">Evidence and metrics</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">Research results kept visible</h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The site presents results from the documented notebooks and service research,
                  including limitations where the evidence is still maturing.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {researchEvidence.map((item) => (
                  <article key={`${item.stream}-${item.metric}`} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="text-[color:var(--green)]" size={22} aria-hidden="true" />
                      <p className="text-sm font-semibold text-[color:var(--muted)]">{item.stream} - {item.metric}</p>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Cross-service loop</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">How one stream changes another</h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The core research contribution is the integration layer. Predictions become
                  operational signals that affect irrigation, crop ranking, water budgeting, and
                  mid-season Plan B decisions.
                </p>
              </div>
              <div className="grid gap-3">
                {integrationSignals.map((item) => (
                  <article key={`${item.from}-${item.to}-${item.signal}`} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--ink)]">
                      <span>{item.from}</span>
                      <ArrowRightLeft size={16} className="text-[color:var(--water)]" aria-hidden="true" />
                      <span>{item.to}</span>
                      <span className="rounded-md bg-white px-2 py-1 text-xs text-[color:var(--muted)]">{item.signal}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.use}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Technologies used</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">A production-style research stack</h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The implementation combines web engineering, IoT communication, geospatial
                  analysis, machine learning, optimization, and deployment infrastructure.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {technologyGroups.map((group) => (
                  <article key={group.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                    <div className="flex items-center gap-3">
                      {group.title.includes("Data") ? (
                        <Database size={22} className="text-[color:var(--water)]" aria-hidden="true" />
                      ) : group.title.includes("Remote") ? (
                        <Layers3 size={22} className="text-[color:var(--clay)]" aria-hidden="true" />
                      ) : group.title.includes("IoT") ? (
                        <Network size={22} className="text-[color:var(--harvest)]" aria-hidden="true" />
                      ) : (
                        <Cpu size={22} className="text-[color:var(--green)]" aria-hidden="true" />
                      )}
                      <h3 className="font-semibold">{group.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{group.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span key={item} className="rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-sm text-[color:var(--ink)]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <AlertTriangle className="text-[color:var(--clay)]" size={28} aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold uppercase text-[color:var(--clay)]">Limitations and future work</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">A transparent research roadmap</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                The project documents where the current prototype is strong, and where additional
                field evidence, data cleaning, or solver maturity is still required.
              </p>
            </div>
            <div className="grid gap-3">
              {limitationsAndFutureWork.map((item) => (
                <article key={item} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4">
                  <p className="text-sm leading-6 text-[color:var(--muted)]">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Service ownership</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <article key={module.id} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <p className="text-sm font-semibold text-[color:var(--muted)]">
                    {module.service} - port {module.port}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{module.shortName}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{module.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.metrics.map((metric) => (
                      <span key={metric} className="rounded-md bg-[color:var(--soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)]">
                        {metric}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
