"use client";

import { FormEvent, useState } from "react";
import { Send, ArrowRight } from "lucide-react";
import { team } from "@/content/site-data";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const primaryEmail = team.find((member) => member.id === "IT22561770")?.email ?? team[0].email;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mailSubject = encodeURIComponent(`[25-26J-520] ${subject}`);
    const mailBody = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:${primaryEmail}?subject=${mailSubject}&body=${mailBody}`;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
          Your Name
          <input
            className="rounded-2xl border border-[color:var(--line)] bg-stone-50/50 px-4 py-3.5 text-sm text-[color:var(--ink)] font-semibold outline-none transition-all placeholder:text-stone-300 focus:border-[color:var(--focus)] focus:bg-white focus:ring-4 focus:ring-[color:var(--soft)]/50"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. John Doe"
          />
        </label>
        
        <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
          Your Email
          <input
            className="rounded-2xl border border-[color:var(--line)] bg-stone-50/50 px-4 py-3.5 text-sm text-[color:var(--ink)] font-semibold outline-none transition-all placeholder:text-stone-300 focus:border-[color:var(--focus)] focus:bg-white focus:ring-4 focus:ring-[color:var(--soft)]/50"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
        Subject / Topic
        <div className="relative">
          <select
            className="w-full rounded-2xl border border-[color:var(--line)] bg-stone-50/50 px-4 py-3.5 text-sm text-[color:var(--ink)] font-semibold outline-none transition-all focus:border-[color:var(--focus)] focus:bg-white focus:ring-4 focus:ring-[color:var(--soft)]/50 appearance-none"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">Select a topic</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Research Collaboration">Research Collaboration</option>
            <option value="Technical Question">Technical Question</option>
            <option value="Submission File Request">Submission File Request</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </label>

      <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">
        Message Body
        <textarea
          className="min-h-36 rounded-2xl border border-[color:var(--line)] bg-stone-50/50 px-4 py-3.5 text-sm text-[color:var(--ink)] font-semibold outline-none transition-all placeholder:text-stone-300 resize-none focus:border-[color:var(--focus)] focus:bg-white focus:ring-4 focus:ring-[color:var(--soft)]/50"
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can we help you?"
        />
      </label>

      <button className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[color:var(--green)] to-[color:var(--water)] px-6 py-4 text-sm font-extrabold text-white shadow-md shadow-emerald-950/15 hover:brightness-110 active:scale-98 transition-all group">
        <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        Send Message
      </button>
    </form>
  );
}
