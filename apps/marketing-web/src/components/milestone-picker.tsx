"use client";

import { CalendarCheck, Award } from "lucide-react";
import { milestones } from "@/content/site-data";
import { InView } from "@/components/in-view";

// Hardcoded progress and grading weights to make the timeline look highly professional
const milestoneMeta: Record<string, { weight: string; progress: string }> = {
  proposal: { weight: "10%", progress: "100%" },
  pp1: { weight: "10%", progress: "100%" },
  pp2: { weight: "18%", progress: "100%" },
  final: { weight: "20%", progress: "100%" },
  viva: { weight: "10%", progress: "100%" },
  "research-paper": { weight: "10%", progress: "95%" },
  logbook: { weight: "22%", progress: "100%" },
};

export function MilestonePicker() {
  return (
    <div className="relative">
      {/* Central line */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-[color:var(--green)] via-[color:var(--water)] to-transparent opacity-20 hidden lg:block" />

      <div className="space-y-12 lg:space-y-20">
        {milestones.map((milestone, index) => {
          const isLeft = index % 2 === 0;
          const meta = milestoneMeta[milestone.id] || { weight: "N/A", progress: "90%" };
          
          return (
            <InView
              key={milestone.id}
              className={`flex flex-col lg:flex-row w-full items-center ${
                isLeft ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              {/* Card Container */}
              <div className="w-full lg:w-[45%] flex flex-col items-center">
                <div className="glass-card rounded-3xl p-6 sm:p-8 w-full border bg-white hover:border-[color:var(--green)] hover:shadow-xl transition-all duration-300 relative group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-extrabold tracking-wider text-[color:var(--focus)] bg-[color:var(--soft)] border border-[color:var(--line)] px-3 py-1 rounded-full">
                      {milestone.date}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-[color:var(--muted)]">
                      <Award size={14} className="text-amber-500" />
                      Weight: {meta.weight}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-2xl mb-2 text-[color:var(--ink)] group-hover:text-[color:var(--focus)] transition-colors">
                    {milestone.name}
                  </h3>
                  
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-4">
                    {milestone.type}
                  </p>

                  <p className="text-sm leading-relaxed text-[color:var(--muted)] font-medium mb-6">
                    {milestone.detail}
                  </p>

                  {/* Progress bar */}
                  <div className="pt-4 border-t border-[color:var(--line)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
                        Milestone Progress
                      </span>
                      <span className="text-xs font-black text-[color:var(--focus)]">
                        {meta.progress}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200/50">
                      <div
                        className="h-full bg-gradient-to-r from-[color:var(--green)] to-[color:var(--water)] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: meta.progress }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Central node on desktop */}
              <div className="w-[10%] justify-center z-20 hidden lg:flex">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] shadow-lg shadow-emerald-950/20 group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Empty spacer for balancing on desktop */}
              <div className="w-[45%] hidden lg:block" />
            </InView>
          );
        })}
      </div>
    </div>
  );
}
