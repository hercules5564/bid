import { cn } from "@/lib/cn";

const sizes = { xs: "h-6 w-6 text-[0.6rem]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  src,
  name,
  size = "sm",
  ring,
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-sand font-semibold text-[#1a1408]/70",
        ring && "ring-2 ring-gold/40 ring-offset-2 ring-offset-ink-900",
        sizes[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
