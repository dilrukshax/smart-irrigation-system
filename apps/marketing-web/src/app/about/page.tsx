import { Mail, UserRound } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { team } from "@/content/site-data";

export default function AboutPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="About us"
          title="Meet the research team"
          lead="Four Software Engineering undergraduates, each leading one research function while collaborating on the integrated system."
          image="/assets/illustrations/hero-team-field.png"
        />
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Project group 25-26J-520</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">
                Functional ownership across F1, F2, F3, and F4.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {team.map((member) => (
                <article key={member.id} className="rounded-lg border border-[color:var(--line)] bg-white p-5">
                  <div className="grid size-16 place-items-center rounded-md bg-[color:var(--ink)] text-lg font-semibold text-white">
                    {member.initials}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[color:var(--green)]">{member.stream}</p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{member.focus}</p>
                  <div className="mt-5 grid gap-2 text-sm text-[color:var(--muted)]">
                    <span className="flex items-center gap-2">
                      <UserRound size={16} aria-hidden="true" />
                      {member.id}
                    </span>
                    <a className="flex items-center gap-2 break-all hover:text-[color:var(--ink)]" href={`mailto:${member.email}`}>
                      <Mail size={16} aria-hidden="true" />
                      {member.email}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            <article className="rounded-lg border border-[color:var(--line)] p-5">
              <p className="text-sm font-semibold text-[color:var(--green)]">Institution</p>
              <h3 className="mt-2 text-xl font-semibold">Sri Lanka Institute of Information Technology</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                Faculty of Computing, BSc (Hons) in Information Technology, Software Engineering.
              </p>
            </article>
            <article className="rounded-lg border border-[color:var(--line)] p-5">
              <p className="text-sm font-semibold text-[color:var(--water)]">Supervision</p>
              <h3 className="mt-2 text-xl font-semibold">Academic supervision</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                Supervisor and co-supervisor names can be added once the final submission pack is confirmed.
              </p>
            </article>
            <article className="rounded-lg border border-[color:var(--line)] p-5">
              <p className="text-sm font-semibold text-[color:var(--harvest)]">Achievement focus</p>
              <h3 className="mt-2 text-xl font-semibold">Integrated research prototype</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                The team contributes working services, models, frontend flows, deployment assets, and evaluation evidence.
              </p>
            </article>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
