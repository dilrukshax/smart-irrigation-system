import Image from "next/image";

type ResearchImageProps = {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
};

export function ResearchImage({
  src,
  alt,
  caption,
  width = 1600,
  height = 900,
}: ResearchImageProps) {
  return (
    <figure className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-white">
      <div className="relative aspect-[16/9] bg-[color:var(--soft)]">
        <Image src={src} alt={alt} width={width} height={height} className="h-full w-full object-contain" />
      </div>
      <figcaption className="border-t border-[color:var(--line)] px-4 py-3 text-sm text-[color:var(--muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}
