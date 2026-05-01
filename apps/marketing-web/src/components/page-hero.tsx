type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  image?: string;
};

export function PageHero({ eyebrow, title, lead, image }: PageHeroProps) {
  return (
    <section
      className="relative overflow-hidden border-b border-[color:var(--line)] bg-[color:var(--ink)] text-white"
      style={
        image
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(24, 39, 34, 0.88), rgba(24, 39, 34, 0.62)), url(${image})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">{lead}</p>
      </div>
    </section>
  );
}
