import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/queries';
import { requireAdmin } from '@/lib/adminGuard';
import { parse, categoryCreateSchema, categoryRenameSchema, reorderSchema } from '@/lib/validation';

export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { data, error } = parse(categoryCreateSchema, body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const all = await getCategories();
    const nextOrder = all.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) + 1;
    const category = await createCategory({ name: data.name, sort_order: nextOrder });
    revalidatePath('/');
    return NextResponse.json({ category });
  } catch (err) {
    // Unique-name violation surfaces as a 23505 Postgres error.
    if (String(err?.code) === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    console.error('Category create failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not create category.' }, { status: 500 });
  }
}

// PATCH handles rename or reorder.
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
      await reorderCategories(data.orderedIds);
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }

    const { data, error } = parse(categoryRenameSchema, body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const category = await updateCategory(data.id, { name: data.name });
    revalidatePath('/');
    return NextResponse.json({ category });
  } catch (err) {
    if (String(err?.code) === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    console.error('Category update failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not update category.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    await deleteCategory(id);
    // Items in this category become uncategorized (category_id -> NULL).
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Category delete failed:', err?.message || err);
    return NextResponse.json({ error: 'Could not delete category.' }, { status: 500 });
  }
}
