import Link from 'next/link';

type RouteGroup = { group: string; items: string[] };

const routes: RouteGroup[] = [
  { group: 'Public', items: ['/', '/login', '/register', '/farmer/landing', '/routes'] },
  { group: 'Farmer', items: ['/farmer', '/farmer/fields', '/farmer/field/1', '/farmer/onboarding', '/farmer/register'] },
  { group: 'Irrigation', items: ['/irrigation', '/irrigation/water', '/irrigation/water-management', '/irrigation/telemetry'] },
  { group: 'Modules', items: ['/crop-health', '/forecasting', '/optimization', '/optimization/recommendations', '/optimization/planner', '/optimization/scenarios', '/optimization/adaptive'] },
  { group: 'Operations', items: ['/operations', '/operations/requests', '/operations/hydraulics'] },
  { group: 'Authority', items: ['/authority/users', '/authority/policies'] },
  { group: 'Mobile', items: ['/mobile/farmer'] },
];

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-[var(--bg)] p-6 md:p-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-white p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">HarvestPulse Routes</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Quick navigation for all current screens.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {routes.map(({ group, items }) => (
            <section key={group} className="rounded-xl border border-[var(--border)] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{group}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {items.map((href) => (
                  <li key={href}>
                    <Link className="text-[var(--primary-600)] hover:underline" href={href}>
                      {href}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
