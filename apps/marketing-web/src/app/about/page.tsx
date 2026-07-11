import { Mail, UserRound, GraduationCap, School, Milestone, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { InView } from "@/components/in-view";
import { team } from "@/content/site-data";

const supervisorTeam = [
  {
    name: "Dr. Dharshana Kasthurirathna",
    role: "Supervisor",
    email: "dharshana.k@sliit.lk",
    affiliation: "Professor / Senior Lecturer, SLIIT Faculty of Computing",
  },
  {
    name: "Ms. Hansi De Silva",
    role: "Co-Supervisor",
    email: "hansi.d@sliit.lk",
    affiliation: "Senior Lecturer, SLIIT Faculty of Computing",
  },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Research Group"
          title="Meet the project team"
          lead="Four Software Engineering undergraduates leading independent research streams while collaborating on the integrated smart-irrigation decision loop."
          image="/assets/illustrations/hero-team-field.png"
        />

        {/* STUDENTS SECTION */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[color:var(--paper)]">
          <div className="mx-auto max-w-7xl space-y-12">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--green)]">
                Project Group 25-26J-520
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Functional stream ownership (F1 - F4)
              </h2>
            </InView>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {team.map((member, idx) => (
                <InView
                  key={member.id}
                  delay={idx * 100}
                  className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:border-[color:var(--green)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="space-y-5">
                    {/* Member Initials Avatar */}
                    <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] text-lg font-black text-white shadow-md shadow-emerald-950/10 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                      {member.initials}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-extrabold text-[color:var(--ink)]">
                        {member.name}
                      </h3>
                      <p className="text-xs font-bold text-[color:var(--focus)] uppercase tracking-wider">
                        {member.stream.split(" - ")[0]}
                      </p>
                    </div>

                    <div className="text-xs text-[color:var(--muted)] font-semibold leading-relaxed">
                      <p className="font-bold text-[color:var(--ink)] mb-1">Focus Area:</p>
                      {member.focus}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[color:var(--line)] space-y-2 text-xs font-bold text-[color:var(--muted)]">
                    <span className="flex items-center gap-2">
                      <UserRound size={14} className="text-[color:var(--green)]" />
                      ID: {member.id}
                    </span>
                    <a
                      className="flex items-center gap-2 hover:text-[color:var(--focus)] transition-colors group/mail"
                      href={`mailto:${member.email}`}
                    >
                      <Mail size={14} className="text-[color:var(--water)]" />
                      <span className="break-all group-hover/mail:underline">{member.email}</span>
                    </a>
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* SUPERVISORS SECTION */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-12">
            <InView className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--water)]">
                Supervision
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Academic guides & advisors
              </h2>
            </InView>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {supervisorTeam.map((supervisor, idx) => (
                <InView
                  key={supervisor.email}
                  delay={idx * 150}
                  className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-[color:var(--water)] hover:shadow-lg transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="grid size-12 place-items-center rounded-xl bg-sky-500/10 text-[color:var(--water)]">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--water)] mb-1">
                        {supervisor.role}
                      </p>
                      <h3 className="text-xl font-extrabold text-[color:var(--ink)]">
                        {supervisor.name}
                      </h3>
                      <p className="text-xs text-[color:var(--muted)] font-semibold mt-1">
                        {supervisor.affiliation}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[color:var(--line)] text-xs font-bold">
                    <a
                      className="inline-flex items-center gap-2 text-[color:var(--muted)] hover:text-[color:var(--focus)] transition-colors group/supermail"
                      href={`mailto:${supervisor.email}`}
                    >
                      <Mail size={14} className="text-[color:var(--water)]" />
                      <span className="group-hover/supermail:underline">{supervisor.email}</span>
                    </a>
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* METADATA / DETAILS SECTION */}
        <section className="border-t border-[color:var(--line)] bg-[color:var(--paper)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 md:grid-cols-3">
              <InView delay={0} className="glass-card rounded-3xl p-6 border transition-shadow duration-300 hover:shadow-md">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-[color:var(--green)] mb-4">
                  <School size={20} />
                </div>
                <h3 className="text-lg font-extrabold text-[color:var(--ink)]">Department</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                  Faculty of Computing, BSc (Hons) in Information Technology, Software Engineering Department, Sri Lanka Institute of Information Technology.
                </p>
              </InView>
              
              <InView delay={100} className="glass-card rounded-3xl p-6 border transition-shadow duration-300 hover:shadow-md">
                <div className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-[color:var(--water)] mb-4">
                  <GraduationCap size={20} />
                </div>
                <h3 className="text-lg font-extrabold text-[color:var(--ink)]">Supervision Type</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                  Regular progress reviews, code walkthroughs, design validations, and academic documentation defense under departmental regulations.
                </p>
              </InView>

              <InView delay={200} className="glass-card rounded-3xl p-6 border transition-shadow duration-300 hover:shadow-md">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-[color:var(--harvest)] mb-4">
                  <Milestone size={20} />
                </div>
                <h3 className="text-lg font-extrabold text-[color:var(--ink)]">Achievement Focus</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)] font-semibold">
                  The project integrates 4 active FastAPI microservices, trained ML models (random forest, LSTM, LightGBM, neural price networks), and an IoT telemetry loop.
                </p>
              </InView>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
