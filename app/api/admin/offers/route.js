import { NextResponse } from 'next/server';
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

function parsePrice(value, label) {
  if (value === '' || value === null || value === undefined) return { value: null };
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return { error: `${label} must be a positive number.` };
  return { value: n };
}

// Create a new offer. Requires an already-uploaded image URL.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const imageUrl = String(body?.image_url || '').trim();
  if (!imageUrl) return NextResponse.json({ error: 'Image is required.' }, { status: 400 });

  const usd = parsePrice(body.price_usd, 'USD price');
  if (usd.error) return NextResponse.json({ error: usd.error }, { status: 400 });
  const lbp = parsePrice(body.price_lbp, 'L.L price');
  if (lbp.error) return NextResponse.json({ error: lbp.error }, { status: 400 });

  try {
    const all = await getOffers();
    const nextOrder = all.reduce((max, o) => Math.max(max, o.sort_order || 0), 0) + 1;
    const offer = await createOffer({
      name: String(body.name || '').trim(),
      image_url: imageUrl,
      price_usd: usd.value,
      price_lbp: lbp.value,
      sort_order: nextOrder,
      active: true,
    });
    return NextResponse.json({ offer });
  } catch (err) {
    console.error('Offer create failed:', err);
    return NextResponse.json({ error: 'Could not add offer.' }, { status: 500 });
  }
}

// PATCH handles: reorder, toggle active, replace image, or edit name/prices.
export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  try {
    if (Array.isArray(body.orderedIds)) {
      await reorderOffers(body.orderedIds);
      return NextResponse.json({ ok: true });
    }

    if (!body.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    if (typeof body.active === 'boolean') {
      const offer = await setOfferActive(body.id, body.active);
      return NextResponse.json({ offer });
    }

    if (body.image_url) {
      const existing = await getOffer(body.id);
      const offer = await updateOfferImage(body.id, String(body.image_url).trim());
      if (existing?.image_url && existing.image_url !== body.image_url) {
        await deleteBlobIfOwned(existing.image_url);
      }
      return NextResponse.json({ offer });
    }

    // Otherwise: edit name + prices.
    const usd = parsePrice(body.price_usd, 'USD price');
    if (usd.error) return NextResponse.json({ error: usd.error }, { status: 400 });
    const lbp = parsePrice(body.price_lbp, 'L.L price');
    if (lbp.error) return NextResponse.json({ error: lbp.error }, { status: 400 });

    const offer = await updateOffer(body.id, {
      name: String(body.name || '').trim(),
      price_usd: usd.value,
      price_lbp: lbp.value,
    });
    return NextResponse.json({ offer });
  } catch (err) {
    console.error('Offer update failed:', err);
    return NextResponse.json({ error: 'Could not update offer.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    const removed = await deleteOffer(id);
    if (removed?.image_url) await deleteBlobIfOwned(removed.image_url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Offer delete failed:', err);
    return NextResponse.json({ error: 'Could not delete offer.' }, { status: 500 });
  }
}
