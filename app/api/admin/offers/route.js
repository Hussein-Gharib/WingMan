import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  updateOfferImage,
  setOfferActive,
  deleteOffer,
  reorderOffers,
} from '@/lib/queries';
import { deleteBlobIfOwned } from '@/lib/blob';
import { requireAdmin } from '@/lib/adminGuard';
import {
  parse,
  offerCreateSchema,
  offerEditSchema,
  offerImageSchema,
  offerActiveSchema,
  reorderSchema,
} from '@/lib/validation';

// Create a new offer. Requires an already-uploaded image URL.
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { data, error } = parse(offerCreateSchema, body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const all = await getOffers();
    const nextOrder = all.reduce((max, o) => Math.max(max, o.sort_order || 0), 0) + 1;
    const offer = await createOffer({
      name: data.name,
      image_url: data.image_url,
      price_usd: data.price_usd ?? null,
      price_lbp: data.price_lbp ?? null,
      sort_order: nextOrder,
      active: true,
    });
    revalidatePath('/');
    return NextResponse.json({ offer });
  } catch (err) {
    console.error('Offer create failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not add offer.' }, { status: 500 });
  }
}

// PATCH handles: reorder, toggle active, replace image, or edit name/prices.
export async function PATCH(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    if ('orderedIds' in body) {
      const { data, error } = parse(reorderSchema, body);
      if (error) return NextResponse.json({ error }, { status: 400 });
      await reorderOffers(data.orderedIds);
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    if (typeof body.active === 'boolean') {
      const { data, error } = parse(offerActiveSchema, body);
      if (error) return NextResponse.json({ error }, { status: 400 });
      const offer = await setOfferActive(data.id, data.active);
      revalidatePath('/');
      return NextResponse.json({ offer });
    }

    if ('image_url' in body) {
      const { data, error } = parse(offerImageSchema, body);
      if (error) return NextResponse.json({ error }, { status: 400 });
      const existing = await getOffer(data.id);
      const offer = await updateOfferImage(data.id, data.image_url);
      if (existing?.image_url && existing.image_url !== data.image_url) {
        await deleteBlobIfOwned(existing.image_url);
      }
      revalidatePath('/');
      return NextResponse.json({ offer });
    }

    // Otherwise: edit name + prices.
    const { data, error } = parse(offerEditSchema, body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const offer = await updateOffer(data.id, {
      name: data.name,
      price_usd: data.price_usd ?? null,
      price_lbp: data.price_lbp ?? null,
    });
    revalidatePath('/');
    return NextResponse.json({ offer });
  } catch (err) {
    console.error('Offer update failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not update offer.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    const removed = await deleteOffer(id);
    if (removed?.image_url) await deleteBlobIfOwned(removed.image_url);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Offer delete failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not delete offer.' }, { status: 500 });
  }
}
