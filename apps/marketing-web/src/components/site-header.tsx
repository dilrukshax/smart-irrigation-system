"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplet, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { navItems } from "@/content/site-data";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/20 bg-white/75 backdrop-blur-xl shadow-[0_4px_30px_rgba(24,39,34,0.03)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--focus)] group"
          aria-label="Adaptive Smart Irrigation home"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[color:var(--green)] to-[color:var(--water)] text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <Droplet size={22} className="fill-white/10" aria-hidden="true" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-base font-extrabold tracking-tight text-[color:var(--ink)]">
              ASIC<span className="text-[color:var(--water)]">OP</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
              Smart Irrigation Platform
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-white text-[color:var(--focus)] border border-[color:var(--line)] shadow-sm font-bold"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--soft)] hover:text-[color:var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Nav Button */}
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-[color:var(--line)] bg-white/50 text-[color:var(--ink)] hover:bg-white active:scale-95 transition-all lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          title={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      {open ? (
        <nav className="border-t border-[color:var(--line)] bg-white/95 backdrop-blur-xl px-4 py-4 lg:hidden shadow-lg animate-in slide-in-from-top-4 duration-200">
          <div className="grid gap-1.5">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    active
                      ? "bg-[color:var(--soft)] text-[color:var(--focus)] border border-[color:var(--line)]"
                      : "text-[color:var(--muted)] hover:bg-[color:var(--soft)] hover:text-[color:var(--ink)]"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
