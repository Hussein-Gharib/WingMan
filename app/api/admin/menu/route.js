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
import { requireAdmin } from '@/lib/adminGuard';
import { parse, menuItemSchema, reorderSchema } from '@/lib/validation';

// Create (no id) or update (with id).
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const { data, error } = parse(menuItemSchema, body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { id, ...fields } = data;

  try {
    if (id) {
      const existing = await getMenuItem(id);
      if (!existing) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
      const saved = await updateMenuItem(id, fields);
      if (existing.image_url && existing.image_url !== fields.image_url) {
        await deleteBlobIfOwned(existing.image_url);
      }
      revalidatePath('/');
      return NextResponse.json({ item: saved });
    }

    const all = await getMenu();
    const nextOrder = all.reduce((max, m) => Math.max(max, m.sort_order || 0), 0) + 1;
    const saved = await createMenuItem({ ...fields, sort_order: nextOrder });
    revalidatePath('/');
    return NextResponse.json({ item: saved });
  } catch (err) {
    console.error('Menu save failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not save item.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    const removed = await deleteMenuItem(id);
    if (removed?.image_url) await deleteBlobIfOwned(removed.image_url);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Menu delete failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not delete item.' }, { status: 500 });
  }
}

// Reorder: body { orderedIds: number[] }
export async function PATCH(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { data, error } = parse(reorderSchema, body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  try {
    await reorderMenu(data.orderedIds);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Menu reorder failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not reorder items.' }, { status: 500 });
  }
}
