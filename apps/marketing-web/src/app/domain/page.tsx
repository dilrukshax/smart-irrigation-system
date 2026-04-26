import { CheckCircle2, Cpu, Database, FlaskConical, Workflow } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ResearchImage } from "@/components/research-image";
import { SiteShell } from "@/components/site-shell";
import {
  literaturePoints,
  methodologySteps,
  modules,
  researchObjectives,
  technologyGroups,
} from "@/lib/site-data";

export default function DomainPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Domain"
          title="Research domain and technical foundation"
          lead="The platform targets quota-based irrigation schemes where field-level water decisions must stay aligned with crop health, rainfall risk, and seasonal area allocation."
          image="/assets/research/fig14_system_architecture.png"
        />

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Literature survey</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">Why this domain matters</h2>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                Smart irrigation research has strong individual pieces, but quota-driven agriculture
                needs them to work together across field operations and seasonal planning.
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
                  Existing systems often solve only one side of the problem: sensor-based
                  irrigation, satellite stress monitoring, rainfall forecasting, or crop planning.
                  The gap is a unified platform where those signals alter each other in real time.
                </p>
              </article>
              <article className="rounded-lg border border-[color:var(--line)] p-6">
                <Workflow className="text-[color:var(--water)]" size={28} aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-semibold">Research problem</h2>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  How can IoT telemetry, crop health analytics, water forecasting, and crop
                  optimization be integrated to reduce water waste and improve crop planning under
                  fixed irrigation quotas in Sri Lankan schemes?
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
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
                <article key={objective.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <CheckCircle2 size={22} className="text-[color:var(--green)]" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold">{objective.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{objective.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-[color:var(--water)]">Methodology</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">From research to integrated prototype</h2>
              <ResearchImage
                src="/assets/research/fig14_system_architecture.png"
                alt="System architecture diagram"
                caption="System architecture showing gateway, services, data layer, and observability."
                width={2385}
                height={1184}
              />
            </div>
            <ol className="grid gap-3">
              {methodologySteps.map((step, index) => (
                <li key={step} className="flex gap-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--ink)] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="self-center text-sm font-medium text-[color:var(--ink)]">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[color:var(--paper)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Technologies used</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">A production-style research stack</h2>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  The implementation uses independent FastAPI services, typed frontend routes,
                  containerized deployment assets, and model artifacts for each research stream.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {technologyGroups.map((group) => (
                  <article key={group.title} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                    <div className="flex items-center gap-3">
                      {group.title.includes("Data") ? (
                        <Database size={22} className="text-[color:var(--water)]" aria-hidden="true" />
                      ) : (
                        <Cpu size={22} className="text-[color:var(--green)]" aria-hidden="true" />
                      )}
                      <h3 className="font-semibold">{group.title}</h3>
                    </div>
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

        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Service ownership</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <article key={module.id} className="rounded-lg border border-[color:var(--line)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--muted)]">
                    {module.service} - port {module.port}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{module.shortName}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{module.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
