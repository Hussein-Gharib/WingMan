import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenu,
} from '@/lib/queries';
import { deleteBlobIfOwned } from '@/lib/blob';

// All handlers here are protected by middleware (/api/admin/*).

// Parse an optional numeric price. Empty -> null. Invalid/negative -> error.
function parsePrice(value, label) {
  if (value === '' || value === null || value === undefined) return { value: null };
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return { error: `${label} must be a positive number.` };
  return { value: n };
}

function parsePayload(body) {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'Item name is required.' };

  const usd = parsePrice(body.price_usd, 'USD price');
  if (usd.error) return { error: usd.error };
  const lbp = parsePrice(body.price_lbp, 'L.L price');
  if (lbp.error) return { error: lbp.error };

  let category_id = null;
  if (body.category_id !== '' && body.category_id !== null && body.category_id !== undefined) {
    category_id = Number(body.category_id);
    if (Number.isNaN(category_id)) category_id = null;
  }

  return {
    data: {
      name,
      description: String(body.description || '').trim(),
      price_usd: usd.value,
      price_lbp: lbp.value,
      category_id,
      image_url: String(body.image_url || '').trim(),
      available: Boolean(body.available),
    },
  };
}

// Create (no id) or update (with id).
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const { data, error } = parsePayload(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    if (body.id) {
      const existing = await getMenuItem(body.id);
      if (!existing) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
      const saved = await updateMenuItem(body.id, data);
      if (existing.image_url && existing.image_url !== data.image_url) {
        await deleteBlobIfOwned(existing.image_url);
      }
      revalidatePath('/');
      return NextResponse.json({ item: saved });
    }

    const all = await getMenu();
    const nextOrder = all.reduce((max, m) => Math.max(max, m.sort_order || 0), 0) + 1;
    const saved = await createMenuItem({ ...data, sort_order: nextOrder });
    revalidatePath('/');
    return NextResponse.json({ item: saved });
  } catch (err) {
    console.error('Menu save failed:', err);
    return NextResponse.json({ error: 'Could not save item.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    const removed = await deleteMenuItem(id);
    if (removed?.image_url) await deleteBlobIfOwned(removed.image_url);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Menu delete failed:', err);
    return NextResponse.json({ error: 'Could not delete item.' }, { status: 500 });
  }
}

// Reorder: body { orderedIds: number[] }
export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.orderedIds)) {
    return NextResponse.json({ error: 'orderedIds array required.' }, { status: 400 });
  }
  try {
    await reorderMenu(body.orderedIds);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Menu reorder failed:', err);
    return NextResponse.json({ error: 'Could not reorder items.' }, { status: 500 });
  }
}
