import type { RepairStatus } from '../../services/repairs';
import { STATUS_LABELS } from '../../services/repairs';

const COLORS: Record<RepairStatus, { bg: string; fg: string }> = {
  received: { bg: '#e0f2fe', fg: '#0082CA' },
  diagnosing: { bg: '#e0f7ff', fg: '#0082CA' },
  waiting_for_approval: { bg: '#fff7e6', fg: '#b45309' },
  in_repair: { bg: '#e6f9ff', fg: '#00829e' },
  ready: { bg: '#e8fff0', fg: '#166534' },
  completed: { bg: '#ecfdf5', fg: '#047857' },
  cancelled: { bg: '#fef2f2', fg: '#B31932' },
};

interface Props {
  status: RepairStatus;
}

const RepairStatusBadge = ({ status }: Props) => {
  const c = COLORS[status];
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.fg,
        padding: '0.25rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
};

export default RepairStatusBadge;
