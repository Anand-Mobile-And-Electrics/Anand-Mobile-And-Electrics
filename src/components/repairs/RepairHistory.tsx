import type { RepairHistoryEntry } from '../../services/repairs';
import { STATUS_LABELS } from '../../services/repairs';
import styles from '../../pages/admin/RepairDetails.module.css';

interface Props {
  entries: RepairHistoryEntry[];
}

const RepairHistory = ({ entries }: Props) => {
  if (entries.length === 0) {
    return <p className={styles.muted}>No status changes recorded yet.</p>;
  }

  return (
    <ul className={styles.historyList}>
      {entries.map((h) => (
        <li key={h.id} className={styles.historyItem}>
          <div className={styles.historyMain}>
            <span>
              {h.old_status ? STATUS_LABELS[h.old_status] : 'Created'}
              {' → '}
              <strong>{STATUS_LABELS[h.new_status]}</strong>
            </span>
          </div>
          <time className={styles.muted} dateTime={h.changed_at}>
            {new Date(h.changed_at).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
};

export default RepairHistory;
