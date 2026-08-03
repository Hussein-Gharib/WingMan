'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const emptyItem = {
  id: null,
  name: '',
  description: '',
  price_usd: '',
  price_lbp: '',
  category_id: '',
  image_url: '',
  available: true,
};

function priceLabel({ price_usd, price_lbp }) {
  const parts = [];
  if (price_usd !== null && price_usd !== '' && price_usd !== undefined) parts.push(`$${Number(price_usd).toFixed(2)}`);
  if (price_lbp !== null && price_lbp !== '' && price_lbp !== undefined) parts.push(`${Math.round(Number(price_lbp)).toLocaleString()} L.L`);
  return parts.join('  ·  ') || 'No price';
}

async function uploadImage(file, prefix) {
  const form = new FormData();
  form.append('file', file);
  form.append('prefix', prefix);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

export default function DashboardClient({
  initialMenu,
  initialOffers,
  initialSettings,
  initialCategories,
}) {
  const router = useRouter();
  const [tab, setTab] = useState('menu');
  const [menu, setMenu] = useState(initialMenu);
  const [offers, setOffers] = useState(initialOffers);
  const [settings, setSettings] = useState(initialSettings);
  const [categories, setCategories] = useState(initialCategories);
  const [flash, setFlash] = useState(null);

  function notify(type, text) {
    setFlash({ type, text });
    if (type === 'success') setTimeout(() => setFlash(null), 2500);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/admin');
    router.refresh();
  }

  const tabs = [
    ['menu', 'Menu'],
    ['categories', 'Categories'],
    ['offers', 'Offers'],
    ['settings', 'Settings'],
  ];

  return (
    <>
      <div className="admin-topbar">
        <span className="title">WingMan Admin</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="a-btn secondary" href="/" target="_blank" rel="noreferrer">View site</a>
          <button className="a-btn secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      <main className="admin-main">
        <div className="tabs">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={`tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {flash && <div className={`msg ${flash.type}`}>{flash.text}</div>}

        {tab === 'menu' && (
          <MenuTab menu={menu} setMenu={setMenu} categories={categories} notify={notify} />
        )}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories}
            setCategories={setCategories}
            setMenu={setMenu}
            notify={notify}
          />
        )}
        {tab === 'offers' && (
          <OffersTab offers={offers} setOffers={setOffers} notify={notify} />
        )}
        {tab === 'settings' && (
          <SettingsTab settings={settings} setSettings={setSettings} notify={notify} />
        )}
      </main>
    </>
  );
}

/* ---------------- Menu tab ---------------- */

function MenuTab({ menu, setMenu, categories, notify }) {
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editing = form.id != null;

  const resetForm = () => setForm(emptyItem);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'menu');
      setForm((f) => ({ ...f, image_url: url }));
      notify('success', 'Image uploaded.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed.');

      // Attach category_name for display (API returns the raw row).
      const cat = categories.find((c) => c.id === data.item.category_id);
      const item = { ...data.item, category_name: cat?.name ?? null };

      setMenu((list) => {
        const exists = list.some((m) => m.id === item.id);
        return exists ? list.map((m) => (m.id === item.id ? item : m)) : [...list, item];
      });
      resetForm();
      notify('success', editing ? 'Item updated.' : 'Item added.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/menu?id=${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed.');
      }
      setMenu((list) => list.filter((m) => m.id !== item.id));
      if (form.id === item.id) resetForm();
      notify('success', 'Item deleted.');
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= menu.length) return;
    const reordered = [...menu];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const prev = menu;
    setMenu(reordered);
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
      if (!res.ok) throw new Error('Reorder failed.');
    } catch (err) {
      setMenu(prev);
      notify('error', err.message);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>{editing ? 'Edit item' : 'Add item'}</h2>
        <form onSubmit={save}>
          <div className="grid-2">
            <div className="field">
              <label>Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Price — USD (optional)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 8.00" value={form.price_usd}
                onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
            </div>
            <div className="field">
              <label>Price — L.L (optional)</label>
              <input type="number" min="0" step="1" placeholder="e.g. 600" value={form.price_lbp}
                onChange={(e) => setForm({ ...form, price_lbp: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label>Image {uploading && '(uploading…)'}</label>
            <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} />
          </div>

          {form.image_url && (
            <div className="checkbox-row">
              <img className="thumb" src={form.image_url} alt="preview" />
              <button type="button" className="a-btn secondary" onClick={() => setForm({ ...form, image_url: '' })}>
                Remove image
              </button>
            </div>
          )}

          <div className="checkbox-row">
            <input id="available" type="checkbox" checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })} />
            <label htmlFor="available">Available</label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="a-btn" type="submit" disabled={saving || uploading}>
              {saving ? 'Saving…' : editing ? 'Update item' : 'Add item'}
            </button>
            {editing && (
              <button type="button" className="a-btn secondary" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Menu items ({menu.length})</h2>
        {menu.length === 0 && <p className="empty-note">No items yet.</p>}
        {menu.map((item, i) => (
          <div className="item-row" key={item.id}>
            <div className="reorder">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === menu.length - 1} aria-label="Move down">↓</button>
            </div>
            {item.image_url
              ? <img className="thumb" src={item.image_url} alt={item.name} />
              : <div className="thumb-empty">🍗</div>}
            <div className="meta">
              <div className="name">{item.name}</div>
              <div className="sub">
                {item.category_name || 'Uncategorized'} · {priceLabel(item)}{' '}
                <span className={`badge ${item.available ? '' : 'off'}`}>
                  {item.available ? 'Available' : 'Hidden'}
                </span>
              </div>
            </div>
            <div className="actions">
              <button className="a-btn secondary" onClick={() => setForm({
                id: item.id,
                name: item.name,
                description: item.description || '',
                price_usd: item.price_usd ?? '',
                price_lbp: item.price_lbp ?? '',
                category_id: item.category_id ?? '',
                image_url: item.image_url || '',
                available: item.available,
              })}>Edit</button>
              <button className="a-btn danger" onClick={() => remove(item)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Categories tab ---------------- */

function CategoriesTab({ categories, setCategories, setMenu, notify }) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not add category.');
      setCategories((list) => [...list, data.category]);
      setName('');
      notify('success', 'Category added.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setAdding(false);
    }
  }

  async function saveRename(id) {
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Rename failed.');
      setCategories((list) => list.map((c) => (c.id === id ? data.category : c)));
      // Reflect the new name on menu items in this category.
      setMenu((list) => list.map((m) => (m.category_id === id ? { ...m, category_name: data.category.name } : m)));
      setEditingId(null);
      notify('success', 'Category renamed.');
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function remove(cat) {
    if (!confirm(`Delete category "${cat.name}"? Items in it become Uncategorized.`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed.');
      }
      setCategories((list) => list.filter((c) => c.id !== cat.id));
      setMenu((list) => list.map((m) => (m.category_id === cat.id ? { ...m, category_id: null, category_name: null } : m)));
      notify('success', 'Category deleted.');
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const prev = categories;
    setCategories(reordered);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error('Reorder failed.');
    } catch (err) {
      setCategories(prev);
      notify('error', err.message);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Add category</h2>
        <form onSubmit={add} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label>Category name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wings" />
          </div>
          <button className="a-btn" type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add'}</button>
        </form>
      </div>

      <div className="panel">
        <h2>Categories ({categories.length})</h2>
        {categories.length === 0 && <p className="empty-note">No categories yet.</p>}
        {categories.map((cat, i) => (
          <div className="item-row" key={cat.id}>
            <div className="reorder">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === categories.length - 1} aria-label="Move down">↓</button>
            </div>
            <div className="meta">
              {editingId === cat.id ? (
                <input type="text" value={editName} autoFocus
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(cat.id); if (e.key === 'Escape') setEditingId(null); }} />
              ) : (
                <div className="name">{cat.name}</div>
              )}
            </div>
            <div className="actions">
              {editingId === cat.id ? (
                <>
                  <button className="a-btn" onClick={() => saveRename(cat.id)}>Save</button>
                  <button className="a-btn secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="a-btn secondary" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>Rename</button>
                  <button className="a-btn danger" onClick={() => remove(cat)}>Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Offers tab ---------------- */

function OffersTab({ offers, setOffers, notify }) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: '', price_usd: '', price_lbp: '', file: null, fileName: '' });

  async function addOffer(e) {
    e.preventDefault();
    if (!draft.file) { notify('error', 'Please choose an image.'); return; }
    setBusy(true);
    try {
      const url = await uploadImage(draft.file, 'offers');
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, name: draft.name, price_usd: draft.price_usd, price_lbp: draft.price_lbp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not add offer.');
      setOffers((list) => [...list, data.offer]);
      setDraft({ name: '', price_usd: '', price_lbp: '', file: null, fileName: '' });
      notify('success', 'Offer added.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  function patch(list, offer) {
    return list.map((o) => (o.id === offer.id ? offer : o));
  }

  async function saveDetails(offer, fields) {
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, ...fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      setOffers((list) => patch(list, data.offer));
      notify('success', 'Offer saved.');
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function replaceImage(offer, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file, 'offers');
      const res = await fetch('/api/admin/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, image_url: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Replace failed.');
      setOffers((list) => patch(list, data.offer));
      notify('success', 'Offer image replaced.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function toggleActive(offer) {
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, active: !offer.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      setOffers((list) => patch(list, data.offer));
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= offers.length) return;
    const reordered = [...offers];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const prev = offers;
    setOffers(reordered);
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((o) => o.id) }),
      });
      if (!res.ok) throw new Error('Reorder failed.');
    } catch (err) {
      setOffers(prev);
      notify('error', err.message);
    }
  }

  async function remove(offer) {
    if (!confirm('Delete this offer?')) return;
    try {
      const res = await fetch(`/api/admin/offers?id=${offer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed.');
      }
      setOffers((list) => list.filter((o) => o.id !== offer.id));
      notify('success', 'Offer deleted.');
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <>
      <div className="panel">
        <h2>Add offer</h2>
        <form onSubmit={addOffer}>
          <div className="grid-2">
            <div className="field">
              <label>Offer name</label>
              <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Family Bucket" />
            </div>
            <div className="field">
              <label>Image</label>
              <input type="file" accept="image/*"
                onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] || null, fileName: e.target.files?.[0]?.name || '' })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Price — USD (optional)</label>
              <input type="number" min="0" step="0.01" value={draft.price_usd} onChange={(e) => setDraft({ ...draft, price_usd: e.target.value })} />
            </div>
            <div className="field">
              <label>Price — L.L (optional)</label>
              <input type="number" min="0" step="1" value={draft.price_lbp} onChange={(e) => setDraft({ ...draft, price_lbp: e.target.value })} />
            </div>
          </div>
          <button className="a-btn" type="submit" disabled={busy}>{busy ? 'Working…' : 'Add offer'}</button>
        </form>
      </div>

      <div className="panel">
        <h2>Offers ({offers.length})</h2>
        {offers.length === 0 && <p className="empty-note">No offers yet.</p>}
        <div className="offer-grid">
          {offers.map((offer, i) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              first={i === 0}
              last={i === offers.length - 1}
              busy={busy}
              onSave={saveDetails}
              onReplace={replaceImage}
              onToggle={toggleActive}
              onMove={(dir) => move(i, dir)}
              onDelete={remove}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function OfferCard({ offer, first, last, busy, onSave, onReplace, onToggle, onMove, onDelete }) {
  const [name, setName] = useState(offer.name || '');
  const [usd, setUsd] = useState(offer.price_usd ?? '');
  const [lbp, setLbp] = useState(offer.price_lbp ?? '');

  return (
    <div className={`offer-item ${offer.active ? '' : 'inactive'}`}>
      <img src={offer.image_url} alt={offer.name || 'offer'} />
      <div className="offer-body">
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field"><label>USD</label>
            <input type="number" min="0" step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} /></div>
          <div className="field"><label>L.L</label>
            <input type="number" min="0" step="1" value={lbp} onChange={(e) => setLbp(e.target.value)} /></div>
        </div>
        <div className="offer-actions">
          <button className="a-btn" onClick={() => onSave(offer, { name, price_usd: usd, price_lbp: lbp })}>Save</button>
          <button className="icon-btn" onClick={() => onMove(-1)} disabled={first} aria-label="Move up">↑</button>
          <button className="icon-btn" onClick={() => onMove(1)} disabled={last} aria-label="Move down">↓</button>
          <button className="a-btn secondary" onClick={() => onToggle(offer)}>{offer.active ? 'Hide' : 'Show'}</button>
          <label className="a-btn secondary" style={{ cursor: 'pointer' }}>
            Replace
            <input type="file" accept="image/*" hidden onChange={(e) => onReplace(offer, e)} disabled={busy} />
          </label>
          <button className="a-btn danger" onClick={() => onDelete(offer)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings tab ---------------- */

function SettingsTab({ settings, setSettings, notify }) {
  const [form, setForm] = useState({
    whatsapp_number: settings.whatsapp_number || '',
    whatsapp_message: settings.whatsapp_message || '',
    phone_number: settings.phone_number || '',
    instagram_url: settings.instagram_url || '',
    working_hours: settings.working_hours || '',
    delivery_areas: settings.delivery_areas || '',
  });
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      setSettings(data.settings);
      setForm((f) => ({ ...f, whatsapp_number: data.settings.whatsapp_number }));
      notify('success', 'Settings saved.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, opts = {}) => (
    <div className="field">
      <label>{label}</label>
      {opts.textarea ? (
        <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : (
        <input type="text" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={opts.placeholder} />
      )}
      {opts.hint && <span className="empty-note" style={{ fontSize: 12 }}>{opts.hint}</span>}
    </div>
  );

  return (
    <div className="panel">
      <h2>Contact & site settings</h2>
      <form onSubmit={save}>
        {field('whatsapp_number', 'WhatsApp number', {
          placeholder: '9613123456',
          hint: 'International format, digits only (no + or spaces).',
        })}
        {field('whatsapp_message', 'Default WhatsApp message', {
          hint: 'Prefilled when a customer taps the WhatsApp button.',
        })}
        {field('phone_number', 'Phone number', { placeholder: '+961 3 123 456' })}
        {field('instagram_url', 'Instagram URL', { placeholder: 'https://instagram.com/…' })}
        {field('working_hours', 'Working hours', { textarea: true })}
        {field('delivery_areas', 'Delivery areas', { textarea: true })}
        <button className="a-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
