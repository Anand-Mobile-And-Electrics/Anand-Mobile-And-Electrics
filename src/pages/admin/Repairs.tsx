import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Repair, RepairStatus, ListRepairsParams } from '../../services/repairs';
import { REPAIR_STATUSES, STATUS_LABELS, listRepairs, getStatusCounts } from '../../services/repairs';
import RepairStatusBadge from '../../components/repairs/RepairStatusBadge';
import RepairFilters from '../../components/repairs/RepairFilters';
import styles from './Repairs.module.css';

const PAGE_SIZE = 10;

const Repairs = () => {
  const [counts, setCounts] = useState<(Record<RepairStatus, number> & { total: number }) | null>(null);
  const [countsError, setCountsError] = useState('');

  const [rows, setRows] = useState<Repair[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RepairStatus | ''>('');
  const [sortBy, setSortBy] = useState<NonNullable<ListRepairsParams['sortBy']>>('created_at');
  const [sortDir, setSortDir] = useState<NonNullable<ListRepairsParams['sortDir']>>('desc');
  const [page, setPage] = useState(1);
  const reqIdRef = useRef(0);

  const loadCounts = useCallback(async () => {
    setCountsError('');
    try {
      setCounts(await getStatusCounts());
    } catch {
      setCountsError('Could not load status counts.');
    }
  }, []);

  const loadRows = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await listRepairs({ search, status, sortBy, sortDir, page, pageSize: PAGE_SIZE });
      // Ignore stale responses that resolved after a newer request started.
      if (reqId !== reqIdRef.current) return;
      setRows(res.rows);
      setTotal(res.count);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError('Could not load repair jobs. Check your connection and try again.');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [search, status, sortBy, sortDir, page]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  // Debounce search / filter changes.
  useEffect(() => {
    const t = setTimeout(() => void loadRows(), 300);
    return () => clearTimeout(t);
  }, [loadRows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Repair Jobs</h2>
          <Link to="/admin/repairs/new" className={styles.primaryLink}>
            + New Repair
          </Link>
        </div>

         {countsError && <div className={styles.error} role="alert">{countsError} <button className={styles.secondaryButton} onClick={() => void loadCounts()}>Retry</button></div>}

        <div className={styles.statGrid}>
          <div className={styles.statTile}>
            <span className={styles.statNum}>{counts ? counts.total : '—'}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          {REPAIR_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.statTile} ${status === s ? styles.statTileActive : ''}`}
              onClick={() => {
                setStatus((prev) => (prev === s ? '' : s));
                setPage(1);
              }}
            >
              <span className={styles.statNum}>{counts ? counts[s] : '—'}</span>
              <span className={styles.statLabel}>{STATUS_LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <RepairFilters
          search={search}
          status={status}
          sortBy={sortBy}
          sortDir={sortDir}
          onChange={(patch) => {
            if (patch.search !== undefined) setSearch(patch.search);
            if (patch.status !== undefined) setStatus(patch.status);
            if (patch.sortBy !== undefined) setSortBy(patch.sortBy);
            if (patch.sortDir !== undefined) setSortDir(patch.sortDir);
            setPage(1);
          }}
        />

        {loading && <p className={styles.muted}>Loading repair jobs…</p>}
         {error && <div className={styles.error} role="alert">{error} <button className={styles.secondaryButton} onClick={() => void loadRows()}>Retry</button></div>}
        {!loading && !error && rows.length === 0 && (
          <p className={styles.muted}>No repair jobs match your filters.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <ul className={styles.jobList}>
            {rows.map((r) => (
              <li key={r.id} className={styles.jobItem}>
                <Link to={`/admin/repairs/${r.id}`} className={styles.jobLink}>
                  <div className={styles.jobTop}>
                    <span className={styles.jobNumber}>{r.job_number}</span>
                    <RepairStatusBadge status={r.status} />
                  </div>
                  <div className={styles.jobMeta}>
                    <span>{r.customers?.full_name ?? 'Unknown customer'}</span>
                    {r.devices && (
                      <span className={styles.muted}>
                        {r.devices.brand} {r.devices.model}
                      </span>
                    )}
                  </div>
                  <div className={styles.jobProblem}>{r.required_work}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && total > 0 && (
          <div className={styles.pagination}>
            <button
              className={styles.secondaryButton}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className={styles.muted}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <button
              className={styles.secondaryButton}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Repairs;
