import { PageHero } from "@/components/page-hero";
import { MilestonePicker } from "@/components/milestone-picker";
import { SiteShell } from "@/components/site-shell";

export default function MilestonesPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Milestones"
          title="Assessment timeline and marks"
          lead="A selectable milestone view for proposal, progress presentations, final assessment, viva, paper, and continuous status documentation."
          image="/assets/illustrations/hero-submission-pack.png"
        />
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <MilestonePicker />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
