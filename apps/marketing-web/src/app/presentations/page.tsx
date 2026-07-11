import { Presentation, ScreenShare, Tv, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteShell } from "@/components/site-shell";
import { InView } from "@/components/in-view";
import { presentations } from "@/content/site-data";

export default function PresentationsPage() {
  return (
    <SiteShell>
      <main>
        <PageHero
          eyebrow="Deliverables"
          title="Presentation slides & decks"
          lead="Academic review decks covering the project proposal, mid-semester progress updates, and final stream-specific technical deep-dives."
          image="/assets/illustrations/hero-submission-pack.png"
        />
        
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[color:var(--paper)]">
          <div className="mx-auto max-w-7xl space-y-16">
            {presentations.map((group, groupIdx) => (
              <InView key={group.category} delay={groupIdx * 100} className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-[color:var(--water)]">
                    <Presentation size={20} className="fill-current/5" />
                  </span>
                  <h2 className="text-2xl font-extrabold text-[color:var(--ink)] tracking-tight">
                    {group.category}
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((item, itemIdx) => {
                    const isPending = item.status.toLowerCase().includes("pending");
                    
                    return (
                      <a
                        key={item.title}
                        href={isPending ? "#" : item.href}
                        target={isPending ? undefined : "_blank"}
                        rel={isPending ? undefined : "noopener noreferrer"}
                        onClick={isPending ? (e) => e.preventDefault() : undefined}
                        className={`group flex flex-col justify-between rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                          isPending
                            ? "opacity-80 cursor-not-allowed hover:border-[color:var(--line)] hover:shadow-sm hover:translate-y-0"
                            : "hover:border-[color:var(--water)] cursor-pointer"
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <span className={`grid size-11 place-items-center rounded-xl transition-colors ${
                              isPending ? "bg-stone-100 text-stone-400" : "bg-sky-500/10 text-[color:var(--water)] group-hover:bg-[color:var(--water)] group-hover:text-white"
                            }`}>
                              {item.title.toLowerCase().includes("deep") ? (
                                <Tv size={18} />
                              ) : (
                                <ScreenShare size={18} />
                              )}
                            </span>
                            
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                              isPending
                                ? "bg-amber-100 text-amber-800"
                                : "bg-sky-100 text-sky-800"
                            }`}>
                              {isPending ? <Clock size={10} /> : <CheckCircle size={10} />}
                              {isPending ? "Review" : "Completed"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="text-base font-extrabold text-[color:var(--ink)] leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs leading-relaxed text-[color:var(--muted)] font-semibold">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-[color:var(--line)] flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                            {item.status}
                          </span>
                          
                          {!isPending && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--water)] group-hover:underline">
                              View Slides
                              <ExternalLink size={12} />
                            </span>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </InView>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
