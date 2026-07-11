import Link from "next/link";
import { MapPin, Mail, Globe, ArrowRight } from "lucide-react";
import { navItems } from "@/content/site-data";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-[color:var(--ink)] text-white/90">
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -left-40 size-80 rounded-full bg-emerald-800/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 size-96 rounded-full bg-sky-800/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Branding & Intro */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] text-white font-black text-lg">
                A
              </span>
              <span className="text-xl font-extrabold tracking-tight text-white">
                ASIC<span className="text-[color:var(--water)]">OP</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              An integrated decision-support system for Sri Lankan irrigation schemes,
              combining IoT sensing, crop health analytics, water forecasting, and adaptive crop planning.
            </p>
            <div className="flex flex-col gap-2.5 text-xs text-white/60">
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-[color:var(--green)]" />
                SLIIT Faculty of Computing, Malabe
              </span>
              <span className="flex items-center gap-2">
                <Globe size={14} className="text-[color:var(--water)]" />
                Software Engineering Research Group
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Navigation</h4>
            <ul className="space-y-3.5 text-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/70 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span className="size-1 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Research Streams */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Research Streams</h4>
            <ul className="space-y-3.5 text-sm text-white/70">
              <li className="flex flex-col">
                <span className="font-semibold text-white">F1 - IoT Smart Water</span>
                <span className="text-xs text-white/50">Telemetry & release classifiers</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-white">F2 - Crop Health</span>
                <span className="text-xs text-white/50">Satellite monitoring & plant diagnosis</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-white">F3 - Water Forecasting</span>
                <span className="text-xs text-white/50">Rainfall & reservoir ML time-series</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-white">F4 - ACA-O Optimization</span>
                <span className="text-xs text-white/50">Fuzzy-TOPSIS suitability planning</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay Updated */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Project Progress</h4>
            <p className="text-sm leading-relaxed text-white/70">
              Explore our code repositories and system outputs on the domain page.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/domain"
                className="inline-flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold border border-white/10 hover:bg-white/10 transition-all text-white group"
              >
                Explore Architecture
                <ArrowRight size={16} className="text-[color:var(--green)] group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/documents"
                className="inline-flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold border border-white/10 hover:bg-white/10 transition-all text-white group"
              >
                Download Submissions
                <ArrowRight size={16} className="text-[color:var(--water)] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/45 font-bold uppercase tracking-widest gap-4">
          <span>Copyright © {new Date().getFullYear()} ASICOP • All Rights Reserved</span>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">BSc (Hons) in IT</span>
            <span className="hover:text-white transition-colors cursor-pointer">Software Engineering</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
