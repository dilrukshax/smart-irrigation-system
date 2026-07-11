import { Mail, MapPin, Phone, ArrowRight, Code } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { InView } from "@/components/in-view";
import { team } from "@/content/site-data";

export default function ContactPage() {
  const primaryEmail = team.find((member) => member.id === "IT22561770")?.email ?? team[0].email;

  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Get In Touch"
          title="Project contact details"
          lead="Reach out to the research team for source-code access, deployment documentation, or academic collaboration inquiries."
          image="/assets/illustrations/hero-team-field.png"
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[color:var(--paper)]">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Left Column: Info Panels */}
              <div className="space-y-6">
                <InView delay={0} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border bg-white">
                  <h2 className="text-xl font-extrabold text-[color:var(--ink)] tracking-tight">
                    General contacts
                  </h2>
                  <div className="space-y-4 text-sm font-semibold text-[color:var(--muted)]">
                    <span className="flex gap-3 items-start">
                      <MapPin size={18} className="shrink-0 text-[color:var(--green)] mt-0.5" />
                      Sri Lanka Institute of Information Technology, Faculty of Computing, Malabe, Sri Lanka.
                    </span>
                    <span className="flex gap-3 items-start">
                      <Phone size={18} className="shrink-0 text-[color:var(--water)] mt-0.5" />
                      SLIIT Software Engineering Department Office: +94 11 754 4800
                    </span>
                    <a
                      className="flex gap-3 items-start hover:text-[color:var(--focus)] transition-colors group"
                      href={`mailto:${primaryEmail}`}
                    >
                      <Mail size={18} className="shrink-0 text-[color:var(--harvest)] mt-0.5" />
                      <span className="break-all group-hover:underline">{primaryEmail}</span>
                    </a>
                  </div>
                </InView>

                <InView delay={100} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border bg-white">
                  <h2 className="text-xl font-extrabold text-[color:var(--ink)] tracking-tight">
                    Direct stream inquiries
                  </h2>
                  <div className="grid gap-3">
                    {team.map((member) => (
                      <a
                        key={member.id}
                        className="rounded-2xl border border-[color:var(--line)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:border-[color:var(--green)] hover:shadow-md transition-all duration-200"
                        href={`mailto:${member.email}`}
                      >
                        <div>
                          <span className="block font-extrabold text-[color:var(--ink)] text-sm">{member.name}</span>
                          <span className="block text-[10px] font-bold text-[color:var(--focus)] uppercase tracking-wider mt-0.5">{member.stream.split(" - ")[0]}</span>
                        </div>
                        <span className="text-xs font-bold text-[color:var(--muted)] hover:text-[color:var(--focus)] break-all">
                          {member.email}
                        </span>
                      </a>
                    ))}
                  </div>
                </InView>
              </div>

              {/* Right Column: Contact Form */}
              <InView delay={150} className="glass-card rounded-3xl p-6 sm:p-8 border bg-white space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-[color:var(--ink)] tracking-tight">
                    Send a message
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                    Construct a structured mail outline using our web portal to open your default desktop or mobile mail client.
                  </p>
                </div>
                <ContactForm />
              </InView>
            </div>
          </div>
        </section>

        {/* EMAIL TEMPLATE BOX */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <InView className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-[color:var(--green)]">
                  <Code size={20} />
                </span>
                <h2 className="text-xl font-extrabold text-[color:var(--ink)] tracking-tight">
                  Reference mail schema
                </h2>
              </div>
              <pre className="overflow-auto rounded-2xl border border-[color:var(--line)] bg-white p-5 text-xs font-mono leading-relaxed text-[color:var(--ink)] shadow-inner">
{`To: ${primaryEmail}
Subject: [25-26J-520] <Your Subject>

Dear Project Group 25-26J-520 Team,

<Your message here>

Best regards,
<Your name>
<Your affiliation>`}
              </pre>
            </InView>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
