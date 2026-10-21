import type { RepairStatus, ListRepairsParams } from '../../services/repairs';
import { REPAIR_STATUSES, STATUS_LABELS } from '../../services/repairs';
import styles from '../../pages/admin/Repairs.module.css';

interface Props {
  search: string;
  status: RepairStatus | '';
  sortBy: NonNullable<ListRepairsParams['sortBy']>;
  sortDir: NonNullable<ListRepairsParams['sortDir']>;
  onChange: (patch: Partial<{
    search: string;
    status: RepairStatus | '';
    sortBy: NonNullable<ListRepairsParams['sortBy']>;
    sortDir: NonNullable<ListRepairsParams['sortDir']>;
  }>) => void;
}

const RepairFilters = ({ search, status, sortBy, sortDir, onChange }: Props) => {
  return (
    <div className={styles.filters}>
      <div className={styles.inputGroup}>
        <label htmlFor="repair-search">Search (job no. / customer / phone / device / problem)</label>
        <input
          id="repair-search"
          type="text"
          value={search}
          placeholder="JOB-1001, name, phone, brand, model…"
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="repair-status">Status</label>
        <select
          id="repair-status"
          value={status}
          onChange={(e) => onChange({ status: e.target.value as RepairStatus | '' })}
        >
          <option value="">All statuses</option>
          {REPAIR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="repair-sort">Sort by</label>
        <select
          id="repair-sort"
          value={sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as Props['sortBy'] })}
        >
          <option value="created_at">Created</option>
          <option value="updated_at">Updated</option>
          <option value="job_number">Job number</option>
          <option value="status">Status</option>
        </select>
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="repair-dir">Order</label>
        <select
          id="repair-dir"
          value={sortDir}
          onChange={(e) => onChange({ sortDir: e.target.value as Props['sortDir'] })}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
    </div>
  );
};

export default RepairFilters;
