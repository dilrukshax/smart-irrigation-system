"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Menu, X } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/lib/site-data";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--focus)]"
          aria-label="Adaptive Smart Irrigation home"
        >
          <span className="grid size-10 place-items-center rounded-md bg-[color:var(--ink)] text-white">
            <Droplets size={22} aria-hidden="true" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-sm font-semibold text-[color:var(--ink)]">
              Adaptive Smart Irrigation
            </span>
            <span className="block text-xs text-[color:var(--muted)]">
              Crop Optimization Platform
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[color:var(--ink)] text-white"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--soft)] hover:text-[color:var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-md border border-[color:var(--line)] text-[color:var(--ink)] lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          title={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-[color:var(--ink)] text-white"
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
