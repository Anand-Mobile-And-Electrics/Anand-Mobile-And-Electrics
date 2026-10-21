import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chooseOffer, getOffers, saveEntry, type SpinOffer } from '../features/spinWheel/repository';
import './SpinWheel.css';

const PENDING_KEY = 'anand-spin-pending-winner-v1';
const formatIndia = (value: string) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
type PendingSpin = { winner: SpinOffer; spunAt: string };

const SEGMENT_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function SpinWheel() {
  const navigate = useNavigate();
  const [offers] = useState(getOffers);
  const [pending, setPending] = useState<PendingSpin | null>(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      return raw ? (JSON.parse(raw) as PendingSpin) : null;
    } catch {
      return null;
    }
  });
  const [spinning, setSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customerName: '', address: '', phone: '', reason: '' });

  const active = offers.filter((offer) => offer.active);
  const selected = pending?.winner ?? null;

  const spin = () => {
    if (spinning || selected || active.length === 0) return;
    const winner = chooseOffer(offers);
    if (!winner) return;
    const winnerIndex = active.findIndex((item) => item.id === winner.id);
    const sliceAngle = 360 / active.length;
    // Calculate rotation so that the pointer at top (270 deg / 0 deg) lands on the winning slice
    const targetAngle = 360 * 5 + (360 - winnerIndex * sliceAngle - sliceAngle / 2);
    const next = { winner, spunAt: new Date().toISOString() };
    setError('');
    setSpinning(true);
    setSpinRotation(targetAngle);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    window.setTimeout(() => {
      setPending(next);
      setSpinning(false);
    }, 2500);
  };

  const resetSpin = () => {
    sessionStorage.removeItem(PENDING_KEY);
    setPending(null);
    setSaved(false);
    setError('');
    setForm({ customerName: '', address: '', phone: '', reason: '' });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (Object.values(form).some((value) => !value.trim())) {
      setError('All customer details are required.');
      return;
    }
    if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      setError('Enter a valid Indian phone number.');
      return;
    }
    const createdAt = new Date(pending.spunAt);
    saveEntry({
      ...form,
      id: crypto.randomUUID(),
      offerId: pending.winner.id,
      createdAt: createdAt.toISOString(),
      offerValidUntil: new Date(createdAt.getTime() + 30 * 86400000).toISOString(),
      recordExpiresAt: new Date(createdAt.getTime() + 45 * 86400000).toISOString(),
    });
    setSaved(true);
    setError('');
  };

  const renderSvgWheel = () => {
    const n = active.length;
    if (n === 0) return null;
    const radius = 150;
    const center = 150;
    const sliceAngle = (2 * Math.PI) / n;

    return (
      <svg
        viewBox="0 0 300 300"
        className="wheel-svg"
        style={{
          transform: `rotate(${spinRotation}deg)`,
          transition: spinning ? 'transform 2.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
        }}
      >
        <circle cx={center} cy={center} r={radius} fill="#1e293b" />
        {active.map((offer, i) => {
          const startAngle = i * sliceAngle - Math.PI / 2;
          const endAngle = (i + 1) * sliceAngle - Math.PI / 2;
          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;
          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const midAngle = (startAngle + endAngle) / 2;
          const textRadius = radius * 0.65;
          const tx = center + textRadius * Math.cos(midAngle);
          const ty = center + textRadius * Math.sin(midAngle);
          const textRotation = (midAngle * 180) / Math.PI + 90;

          // Short label for display inside wedge: strip prefix if needed or wrap
          const cleanLabel = offer.label.replace(/^Surprise:\s*/i, '');

          return (
            <g key={offer.id}>
              <path
                d={pathData}
                fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={tx}
                y={ty}
                fill="#ffffff"
                fontSize={n > 8 ? "9" : "11"}
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                className="wheel-slice-text"
              >
                {cleanLabel}
              </text>
            </g>
          );
        })}
        {/* Wheel center pin */}
        <circle cx={center} cy={center} r="24" fill="#0f172a" stroke="#f8fafc" strokeWidth="4" />
        <text
          x={center}
          y={center}
          fill="#f8fafc"
          fontSize="11"
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="central"
        >
          WIN
        </text>
      </svg>
    );
  };

  return (
    <main className="spin-page">
      <header>
        <p className="eyebrow">CUSTOMER OFFERS & REWARDS</p>
        <h1>Spin the Wheel</h1>
        <p>Spin the lucky wheel to award a surprise customer discount or gift!</p>
        <button className="secondary-button" onClick={() => navigate('/admin/spin-wheel/offers')}>
          ← Return to Offer Management
        </button>
      </header>

      <section className="wheel-card">
        {active.length === 0 && !selected && (
          <div className="empty-state">
            <p>No active surprise offers are available. Please activate offers in Offer Management.</p>
            <button onClick={() => navigate('/admin/spin-wheel/offers')}>Open Offer Management</button>
          </div>
        )}

        {active.length > 0 && (
          <div className="wheel-wrapper">
            <div className="wheel-pointer">▼</div>
            <div className="wheel-container">
              {renderSvgWheel()}
            </div>
          </div>
        )}

        {!selected && active.length > 0 && (
          <button className="spin-button" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning the Wheel…' : 'SPIN THE WHEEL NOW'}
          </button>
        )}

        {selected && (
          <div className="result">
            <div className="winner-badge">🎉 Congratulations!</div>
            <h2>{selected.label}</h2>
            <p className="winner-desc">{selected.description}</p>
            <div className="validity-meta">
              <p>
                <strong>Spin / Issue Date:</strong> {formatIndia(pending!.spunAt)}
              </p>
              <p className="validity-note">
                Offer valid for 30 days from spin time. 45-day retention period.
              </p>
            </div>

            {saved ? (
              <div className="saved-success-box">
                <p className="success-message">Winning offer & customer details recorded successfully!</p>
                <button className="spin-again-button" onClick={resetSpin}>
                  Spin Again for Next Customer
                </button>
              </div>
            ) : (
              <form onSubmit={save} className="spin-claim-form">
                <h3>Record Customer Claim</h3>
                <input
                  required
                  aria-label="Customer name"
                  placeholder="Customer name *"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
                <input
                  required
                  aria-label="Address"
                  placeholder="Address *"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <input
                  required
                  aria-label="Phone number"
                  placeholder="Phone number (10-digit Indian) *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  required
                  aria-label="Reason issued"
                  placeholder="Reason for reward (e.g. Festival offer, Repair customer) *"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
                {error && <p className="error-message">{error}</p>}
                <div className="form-actions">
                  <button type="submit" className="save-button">
                    Save Winning Offer
                  </button>
                  <button type="button" className="cancel-button" onClick={resetSpin}>
                    Cancel / Discard
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
