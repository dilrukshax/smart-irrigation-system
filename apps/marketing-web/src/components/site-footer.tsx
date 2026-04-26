import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { navItems, team } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--line)] bg-[color:var(--ink)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-lg font-semibold">Adaptive Smart Irrigation and Crop Optimization Platform</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
            A 4th year Software Engineering research platform for water-aware irrigation,
            crop health monitoring, forecasting, and adaptive crop area planning in Sri Lanka.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-white/72">
            <span className="flex items-center gap-2">
              <MapPin size={16} aria-hidden="true" />
              Sri Lanka Institute of Information Technology
            </span>
            <a className="flex items-center gap-2 hover:text-white" href={`mailto:${team[0].email}`}>
              <Mail size={16} aria-hidden="true" />
              {team[0].email}
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Website</p>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Research Streams</p>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            <span>F1 - IoT smart irrigation</span>
            <span>F2 - Crop health detection</span>
            <span>F3 - Water forecasting</span>
            <span>F4 - ACA-O optimization</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
