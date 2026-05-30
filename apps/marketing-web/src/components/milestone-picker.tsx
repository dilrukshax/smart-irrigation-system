"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { milestones } from "@/content/site-data";

export function MilestonePicker() {
  const [selectedId, setSelectedId] = useState(milestones[0].id);
  const selected = useMemo(
    () => milestones.find((milestone) => milestone.id === selectedId) ?? milestones[0],
    [selectedId],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-[color:var(--line)] bg-white p-5">
        <label className="grid gap-2 text-sm font-semibold text-[color:var(--ink)]" htmlFor="milestone">
          Select milestone
          <select
            id="milestone"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="rounded-md border border-[color:var(--line)] bg-white px-3 py-3 text-sm font-medium outline-none focus:border-[color:var(--focus)]"
          >
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 rounded-lg bg-[color:var(--soft)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--green)]">
            <CalendarCheck size={18} aria-hidden="true" />
            {selected.name}
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-[color:var(--muted)]">Date</dt>
              <dd className="font-semibold text-[color:var(--ink)]">{selected.date}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--muted)]">Assessment type</dt>
              <dd className="font-semibold text-[color:var(--ink)]">{selected.type}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{selected.detail}</p>
        </div>
      </section>

      <section className="grid gap-3">
        {milestones.map((milestone) => (
          <button
            key={milestone.id}
            type="button"
            onClick={() => setSelectedId(milestone.id)}
            className={`grid gap-2 rounded-lg border p-5 text-left transition hover:-translate-y-0.5 ${
              milestone.id === selectedId
                ? "border-[color:var(--green)] bg-white shadow-sm"
                : "border-[color:var(--line)] bg-white"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold text-[color:var(--ink)]">{milestone.name}</span>
              <ChevronRight size={18} aria-hidden="true" className="text-[color:var(--muted)]" />
            </span>
            <span className="text-sm text-[color:var(--muted)]">
              {milestone.date} - {milestone.type}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
