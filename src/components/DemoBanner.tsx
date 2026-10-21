import { isDemoMode } from '../data/demoMode';

/**
 * Visible indicator shown only when the app is running on the local in-memory
 * demo adapter (VITE_DEMO_MODE=true). Makes it unmistakable that the data on
 * screen is synthetic, never real business data.
 */
const DemoBanner = () => {
  if (!isDemoMode()) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 2000,
        backgroundColor: '#B31932',
        color: '#fff',
        padding: '0.5rem 0.85rem',
        borderRadius: 9999,
        fontSize: '0.75rem',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        letterSpacing: '0.02em',
      }}
    >
      DEMO MODE — synthetic data, not live
    </div>
  );
};

export default DemoBanner;
