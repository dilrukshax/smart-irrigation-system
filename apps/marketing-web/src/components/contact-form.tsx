"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { team } from "@/lib/site-data";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mailSubject = encodeURIComponent(`[25-26J-520] ${subject}`);
    const mailBody = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:${team[0].email}?subject=${mailSubject}&body=${mailBody}`;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
        Your name
        <input
          className="rounded-md border border-[color:var(--line)] bg-white px-3 py-3 text-sm outline-none transition focus:border-[color:var(--focus)]"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
        Your email
        <input
          className="rounded-md border border-[color:var(--line)] bg-white px-3 py-3 text-sm outline-none transition focus:border-[color:var(--focus)]"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
        Subject
        <select
          className="rounded-md border border-[color:var(--line)] bg-white px-3 py-3 text-sm outline-none transition focus:border-[color:var(--focus)]"
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
      </label>
      <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
        Message
        <textarea
          className="min-h-36 rounded-md border border-[color:var(--line)] bg-white px-3 py-3 text-sm outline-none transition focus:border-[color:var(--focus)]"
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write your message"
        />
      </label>
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--green)]">
        <Send size={17} aria-hidden="true" />
        Send Message
      </button>
    </form>
  );
}
