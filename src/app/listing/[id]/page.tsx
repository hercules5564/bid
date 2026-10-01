import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, TrendingUp, Tag, ReceiptText, ArrowRight } from "lucide-react";
import { getSessionUserId } from "@/lib/auth";
import { getListingDetail, incrementView } from "@/server/listings";
import { getOrderForListing } from "@/server/orders";
import { formatMoney } from "@/lib/money";
import { Gallery } from "@/components/listing/Gallery";
import { ListingLive } from "@/components/listing/ListingLive";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await getListingDetail(id);
  return { title: l ? l.title : "Lot not found" };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getSessionUserId();
  const [detail, order] = await Promise.all([
    getListingDetail(id, uid),
    uid ? getOrderForListing(id, uid) : Promise.resolve(null),
  ]);
  if (!detail) notFound();
  void incrementView(id);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/browse?category=${detail.category.slug}`}
        className="mb-5 inline-flex items-center gap-1 text-sm text-[#1a1408]/45 transition-colors hover:text-[#1a1408]"
      >
        <ChevronLeft size={15} /> {detail.category.name}
      </Link>

      {order && uid && detail.winner?.id === uid && order.status === "PENDING" && (
        <Link
          href={`/checkout/${order.id}`}
          className="group mb-6 flex items-center gap-4 rounded-2xl border border-ember/25 bg-ember/[0.06] px-5 py-4 transition-colors hover:border-ember/45"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ember/30 bg-ember/10 text-ember">
            <ReceiptText size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold text-[#1a1408]">
              You won this lot — checkout now
            </span>
            <span className="block text-xs text-[#1a1408]/50">
              Pay {formatMoney(order.amount)} to complete your purchase.
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-[#1a1408]/40 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-6">
          <Gallery images={detail.images} title={detail.title} />

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#1a1408]/50">
              <CategoryIcon icon={detail.category.icon} size={13} />
              {detail.category.name}
            </div>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-[#1a1408] sm:text-3xl">
              {detail.title}
            </h1>
          </div>

          <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-[#1a1408]/65">{detail.description}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Started at" value={formatMoney(detail.startingPrice)} icon={<Tag size={13} />} />
            <Fact label="Min raise" value={formatMoney(detail.bidIncrement)} icon={<TrendingUp size={13} />} />
            <Fact label="Total bids" value={detail.bidCount.toString()} />
            <Fact label="Views" value={detail.viewCount.toString()} icon={<Eye size={13} />} />
          </div>

          <div className="panel-flat flex items-center gap-3 p-4">
            <Avatar src={detail.seller.avatar} name={detail.seller.name} size="md" />
            <div>
              <div className="label-caps">Listed by</div>
              <Link href={`/u/${detail.seller.handle}`} className="text-sm font-semibold text-[#1a1408] hover:text-gold">
                @{detail.seller.handle}
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ListingLive detail={detail} sellerId={detail.seller.id} />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="panel-flat p-3">
      <div className="label-caps mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="num text-sm font-bold text-[#1a1408]">{value}</div>
    </div>
  );
}
