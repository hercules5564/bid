import type { ListingSummary } from "@/types";
import { ListingCard } from "./ListingCard";
import { SectionHeader, EmptyState } from "@/components/ui/section";

export function CardRail({
  title,
  kicker,
  icon,
  href,
  items,
  emptyLabel = "Nothing here right now.",
}: {
  title: string;
  kicker?: string;
  icon?: React.ReactNode;
  href?: string;
  items: ListingSummary[];
  emptyLabel?: string;
}) {
  return (
    <section>
      <SectionHeader title={title} kicker={kicker} icon={icon} href={items.length > 4 ? href : undefined} />
      {items.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <div className="rail -mx-1 px-1">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} className="w-[260px] shrink-0 snap-start sm:w-[280px]" />
          ))}
        </div>
      )}
    </section>
  );
}

export function CardGrid({ items }: { items: ListingSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
