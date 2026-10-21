import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chooseOffer, getOffers, saveEntry, type SpinOffer } from '../features/spinWheel/repository';
import './SpinWheel.css';

const PENDING_KEY = 'anand-spin-pending-winner-v1';
const formatIndia = (value: string) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
type PendingSpin = { winner: SpinOffer; spunAt: string };

export default function SpinWheel() {
  const navigate = useNavigate();
  const [offers] = useState(getOffers);
  const [pending, setPending] = useState<PendingSpin | null>(() => { try { const raw = sessionStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) as PendingSpin : null; } catch { return null; } });
  const [spinning, setSpinning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customerName: '', address: '', phone: '', reason: '' });
  const active = offers.filter((offer) => offer.active);
  const selected = pending?.winner ?? null;
  const segmentStyle = active.length ? { '--segments': active.length } as React.CSSProperties : undefined;
  const spin = () => { if (spinning || selected || active.length === 0) return; const winner = chooseOffer(offers); if (!winner) return; const next = { winner, spunAt: new Date().toISOString() }; setError(''); setSpinning(true); sessionStorage.setItem(PENDING_KEY, JSON.stringify(next)); window.setTimeout(() => { setPending(next); setSpinning(false); }, 1800); };
  const save = (event: React.FormEvent) => { event.preventDefault(); if (!pending) return; if (Object.values(form).some((value) => !value.trim())) { setError('All customer details are required.'); return; } if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) { setError('Enter a valid Indian phone number.'); return; } const createdAt = new Date(pending.spunAt); saveEntry({ ...form, id: crypto.randomUUID(), offerId: pending.winner.id, createdAt: createdAt.toISOString(), offerValidUntil: new Date(createdAt.getTime() + 30 * 86400000).toISOString(), recordExpiresAt: new Date(createdAt.getTime() + 45 * 86400000).toISOString() }); setSaved(true); setError(''); };
  return <main className="spin-page"><header><p className="eyebrow">OWNER PREVIEW · LOCAL ONLY</p><h1>Spin the Wheel</h1><p>Spin to select one of {active.length} active offers.</p><button onClick={() => navigate('/admin/spin-wheel/offers')}>← Return to Offer Management</button></header><section className="wheel-card">{active.length === 0 && !selected && <div className="empty-state"><p>No active offers are available. Please add or activate offers in Offer Management.</p><button onClick={() => navigate('/admin/spin-wheel/offers')}>Open Offer Management</button></div>}{active.length > 0 && <div className={`wheel ${spinning ? 'is-spinning' : ''}`} style={segmentStyle}>{active.map((offer, index) => <span key={offer.id} style={{ '--segment-index': index } as React.CSSProperties}>{offer.label}</span>)}<b>▲</b></div>}{!selected && active.length > 0 && <button className="spin-button" onClick={spin} disabled={spinning}>{spinning ? 'Spinning…' : 'SPIN NOW'}</button>}{selected && <div className="result"><h2>{selected.label}</h2><p>{selected.description}</p><p>Spin/issue date: {formatIndia(pending!.spunAt)}</p><p>Offer valid for 30 days. The saved validity deadline is calculated from the actual spin timestamp.</p>{saved ? <p className="success-message">Winning offer saved successfully.</p> : <form onSubmit={save}><input required aria-label="Customer name" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /><input required aria-label="Address" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /><input required aria-label="Phone number" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input required aria-label="Reason issued" placeholder="Reason the offer is being issued" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />{error && <p className="error-message">{error}</p>}<button type="submit">Save Winning Offer</button></form>}</div>}</section></main>;
}
