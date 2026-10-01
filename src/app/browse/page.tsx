import { LayoutGrid } from "lucide-react";
import { browseListings, getCategoriesWithCounts, type BrowseParams } from "@/server/listings";
import { Filters } from "@/components/browse/Filters";
import { CardGrid } from "@/components/listing/CardRail";
import { EmptyState } from "@/components/ui/section";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse lots" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const min = one(sp.min) ? Number(one(sp.min)) * 100 : undefined;
  const max = one(sp.max) ? Number(one(sp.max)) * 100 : undefined;

  const params: BrowseParams = {
    category: one(sp.category),
    durationType: one(sp.duration),
    sort: (one(sp.sort) as BrowseParams["sort"]) ?? "ending",
    q: one(sp.q),
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) ? max : undefined,
    includeClosed: one(sp.ended) === "1",
  };

  const [listings, categories] = await Promise.all([browseListings(params), getCategoriesWithCounts()]);
  const activeCat = categories.find((c) => c.slug === params.category);

  return (
    <div>
      <div className="mb-5">
        <div className="label-caps mb-1 flex items-center gap-1.5">
          <LayoutGrid size={13} /> The floor
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#1a1408]">
          {activeCat ? activeCat.name : params.q ? `“${params.q}”` : "Browse all lots"}
        </h1>
        <p className="num mt-1 text-sm text-[#1a1408]/55">
          {listings.length} {listings.length === 1 ? "lot" : "lots"}
        </p>
      </div>

      <Filters categories={categories} />

      {listings.length === 0 ? (
        <EmptyState title="No lots match those filters" body="Try widening the price range or clearing a filter." />
      ) : (
        <CardGrid items={listings} />
      )}
    </div>
  );
}
