import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <main className="px-4 py-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase text-[color:var(--green)]">Page not found</p>
          <h1 className="mt-3 text-4xl font-semibold">This route is not part of the marketing site.</h1>
          <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
            Return to the homepage or use the main navigation to open a project section.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Home
          </Link>
        </section>
      </main>
    </SiteShell>
  );
}
