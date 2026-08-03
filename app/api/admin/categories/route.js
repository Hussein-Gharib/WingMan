import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/queries';

// Category management. Protected by middleware (/api/admin/*).

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });

  try {
    const all = await getCategories();
    const nextOrder = all.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) + 1;
    const category = await createCategory({ name, sort_order: nextOrder });
    revalidatePath('/');
    return NextResponse.json({ category });
  } catch (err) {
    // Unique-name violation surfaces as a 23505 Postgres error.
    if (String(err?.code) === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    console.error('Category create failed:', err);
    return NextResponse.json({ error: 'Could not create category.' }, { status: 500 });
  }
}

// PATCH handles rename or reorder.
export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  try {
    if (Array.isArray(body.orderedIds)) {
      await reorderCategories(body.orderedIds);
      revalidatePath('/');
      return NextResponse.json({ ok: true });
    }
    const name = String(body.name || '').trim();
    if (!body.id || !name) {
      return NextResponse.json({ error: 'Category id and name are required.' }, { status: 400 });
    }
    const category = await updateCategory(body.id, { name });
    revalidatePath('/');
    return NextResponse.json({ category });
  } catch (err) {
    if (String(err?.code) === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    console.error('Category update failed:', err);
    return NextResponse.json({ error: 'Could not update category.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    await deleteCategory(id);
    // Items in this category become uncategorized (category_id -> NULL).
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Category delete failed:', err);
    return NextResponse.json({ error: 'Could not delete category.' }, { status: 500 });
  }
}
