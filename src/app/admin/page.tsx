import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusSquare, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoriesWithCounts } from "@/server/listings";
import { formatMoney } from "@/lib/money";
import { CreateListingForm } from "@/components/admin/CreateListingForm";
import { RotateShowdownButton } from "@/components/admin/RotateShowdownButton";
import { StatusPill, DurationBadge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · List an item" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN" && user.role !== "SELLER") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sellers only</h1>
        <p className="mt-2 text-white/50">This area is for the auction house. Your account can't list items yet.</p>
        <Link href="/browse" className="btn-gold mt-6">
          Back to browsing
        </Link>
      </div>
    );
  }

  const [categories, recent] = await Promise.all([
    getCategoriesWithCounts(),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 14,
      select: { id: true, title: true, status: true, durationType: true, currentPrice: true, bidCount: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-caps mb-1 flex items-center gap-1.5">
            <Settings2 size={13} /> Auction house
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white">List an item</h1>
        </div>
        {user.role === "ADMIN" && <RotateShowdownButton />}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
            <PlusSquare size={15} className="text-gold" /> New listing
          </div>
          <CreateListingForm categories={categories} />
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold text-white/70">Recently listed</div>
          <div className="panel divide-y divide-white/[0.05]">
            {recent.map((l) => (
              <Link
                key={l.id}
                href={`/listing/${l.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{l.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <DurationBadge type={l.durationType as never} />
                    <StatusPill status={l.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-bold text-gold">{formatMoney(l.currentPrice)}</div>
                  <div className="num text-xs text-white/35">{l.bidCount} bids</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
