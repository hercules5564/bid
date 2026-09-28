import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computeEndsAt, type DurationType } from "@/lib/time";
import { invalidate } from "@/lib/cache";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  images: z.array(z.string().url()).min(1, "Add at least one image URL").max(8),
  categorySlug: z.string().min(1),
  startingPrice: z.number().int().positive(), // rupees
  bidIncrement: z.number().int().positive(), // rupees
  buyNowPrice: z.number().int().positive().nullable().optional(), // rupees
  durationType: z.enum(["HOURLY", "DAILY", "WEEKLY"]),
  hours: z.number().int().min(1).max(6).optional(),
  startInMinutes: z.number().int().min(0).max(10080).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "SELLER") {
    return NextResponse.json({ ok: false, error: "Only sellers can create listings." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const category = await prisma.category.findUnique({ where: { slug: d.categorySlug } });
  if (!category) return NextResponse.json({ ok: false, error: "Unknown category." }, { status: 400 });

  if (d.buyNowPrice && d.buyNowPrice <= d.startingPrice) {
    return NextResponse.json({ ok: false, error: "Buy Now must be above the starting price." }, { status: 400 });
  }

  const startsAt = new Date(Date.now() + (d.startInMinutes ?? 0) * 60 * 1000);
  const endsAt = computeEndsAt(d.durationType as DurationType, startsAt, d.hours);
  const startingPaise = d.startingPrice * 100;

  const listing = await prisma.listing.create({
    data: {
      title: d.title,
      description: d.description,
      images: d.images,
      categoryId: category.id,
      sellerId: user.id,
      startingPrice: startingPaise,
      currentPrice: startingPaise,
      bidIncrement: d.bidIncrement * 100,
      buyNowPrice: d.buyNowPrice ? d.buyNowPrice * 100 : null,
      durationType: d.durationType,
      startsAt,
      endsAt,
      status: startsAt <= new Date() ? "LIVE" : "SCHEDULED",
    },
    select: { id: true },
  });

  invalidate("rail", "categories");
  return NextResponse.json({ ok: true, id: listing.id });
}
