import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries, getOffers, saveOffers, type SpinOffer } from '../features/spinWheel/repository';
import './SpinWheel.css';

const now = () => new Date().toISOString();

export default function OfferManagement() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState(getOffers);
  const [editing, setEditing] = useState<SpinOffer | null>(null);
  const [draft, setDraft] = useState({ label: '', description: '' });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const update = (next: SpinOffer[]) => { setOffers(next); saveOffers(next); };
  const beginAdd = () => { setEditing(null); setDraft({ label: '', description: '' }); };
  const beginEdit = (offer: SpinOffer) => { setEditing(offer); setDraft({ label: offer.label, description: offer.description }); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.label.trim() || !draft.description.trim()) return;
    const timestamp = now();
    if (editing) update(offers.map((offer) => offer.id === editing.id ? { ...offer, label: draft.label.trim(), description: draft.description.trim(), updatedAt: timestamp } : offer));
    else update([...offers, { id: `sample-${crypto.randomUUID()}`, label: draft.label.trim(), description: draft.description.trim(), category: 'Sample', active: true, createdAt: timestamp, updatedAt: timestamp }]);
    setEditing(null); setDraft({ label: '', description: '' });
  };
  const remove = (id: string) => { update(offers.filter((offer) => offer.id !== id)); setConfirmRemove(null); };
  return <main className="spin-page"><header><p className="eyebrow">OWNER PREVIEW · LOCAL ONLY</p><h1>Spin the Wheel — Offer Management</h1><p>Manage the offers available on the spinning wheel.</p></header><section className="owner-panel"><div className="page-actions"><button onClick={beginAdd}>Add Offer</button><button onClick={() => navigate('/admin/spin-wheel')}>Open Spin the Wheel →</button></div>{offers.length === 0 ? <p>No offers configured. Add an offer to begin.</p> : offers.map((offer) => <article className="offer-card" key={offer.id}><div><h2>{offer.label}</h2><p>{offer.description}</p><span className={offer.active ? 'status active' : 'status'}>{offer.active ? 'Active' : 'Inactive'}</span></div><div className="offer-actions"><button onClick={() => beginEdit(offer)}>Edit</button><button onClick={() => update(offers.map((item) => item.id === offer.id ? { ...item, active: !item.active, updatedAt: now() } : item))}>{offer.active ? 'Deactivate' : 'Activate'}</button><button onClick={() => setConfirmRemove(offer.id)}>Remove</button></div></article>)}<p>{getEntries().length} saved local record(s). Removing an offer does not remove historical records.</p></section>{(editing || draft.label || draft.description) && <section className="result"><h2>{editing ? 'Edit Offer' : 'Add Offer'}</h2><form onSubmit={save}><input required aria-label="Offer title" placeholder="Offer title" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /><textarea required aria-label="Offer description" placeholder="Offer description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><div className="page-actions"><button type="submit">Save Offer</button><button type="button" onClick={() => { setEditing(null); setDraft({ label: '', description: '' }); }}>Cancel</button></div></form></section>}{confirmRemove && <section className="confirm-box"><p>Remove this offer from the wheel configuration? Historical records will be preserved.</p><button onClick={() => remove(confirmRemove)}>Confirm removal</button><button onClick={() => setConfirmRemove(null)}>Cancel</button></section>}</main>;
}
