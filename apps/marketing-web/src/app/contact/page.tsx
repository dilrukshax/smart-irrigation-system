import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { team } from "@/content/site-data";

export default function ContactPage() {
  const primaryEmail = team.find((member) => member.id === "IT22561770")?.email ?? team[0].email;

  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Contact us"
          title="Project contact details"
          lead="General contact information, team email links, and a mail-ready contact form for project inquiries."
          image="/assets/illustrations/hero-team-field.png"
        />
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-5">
              <article className="rounded-lg border border-[color:var(--line)] bg-white p-6">
                <h2 className="text-2xl font-semibold">General contacts</h2>
                <div className="mt-5 grid gap-4 text-sm text-[color:var(--muted)]">
                  <span className="flex gap-3">
                    <MapPin size={18} className="shrink-0 text-[color:var(--green)]" aria-hidden="true" />
                    Sri Lanka Institute of Information Technology, Faculty of Computing
                  </span>
                  <span className="flex gap-3">
                    <Phone size={18} className="shrink-0 text-[color:var(--water)]" aria-hidden="true" />
                    Phone number can be added after final project contact approval.
                  </span>
                  <a className="flex gap-3 hover:text-[color:var(--ink)]" href={`mailto:${primaryEmail}`}>
                    <Mail size={18} className="shrink-0 text-[color:var(--harvest)]" aria-hidden="true" />
                    {primaryEmail}
                  </a>
                </div>
              </article>

              <article className="rounded-lg border border-[color:var(--line)] bg-white p-6">
                <h2 className="text-2xl font-semibold">Team emails</h2>
                <div className="mt-5 grid gap-3">
                  {team.map((member) => (
                    <a
                      key={member.id}
                      className="rounded-md border border-[color:var(--line)] px-3 py-3 text-sm transition hover:border-[color:var(--green)]"
                      href={`mailto:${member.email}`}
                    >
                      <span className="block font-semibold text-[color:var(--ink)]">{member.name}</span>
                      <span className="block break-all text-[color:var(--muted)]">{member.email}</span>
                    </a>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-lg border border-[color:var(--line)] bg-white p-6">
              <h2 className="text-2xl font-semibold">Send a message</h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                The form opens your default email client with the message addressed to the project team.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </article>
          </div>
        </section>

        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-6">
            <h2 className="text-2xl font-semibold">General email template</h2>
            <pre className="mt-5 overflow-auto rounded-lg border border-[color:var(--line)] bg-white p-5 text-sm leading-7 text-[color:var(--ink)]">
{`To: ${primaryEmail}
Subject: [25-26J-520] <Your Subject>

Dear Project Group 25-26J-520 Team,

<Your message here>

Best regards,
<Your name>
<Your affiliation>`}
            </pre>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
