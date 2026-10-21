import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Repair, RepairStatus, RepairHistoryEntry } from '../../services/repairs';
import {
  REPAIR_STATUSES,
  STATUS_LABELS,
  getRepair,
  getRepairHistory,
  updateRepairStatus,
  updateRepairNotes,
} from '../../services/repairs';
import RepairStatusBadge from '../../components/repairs/RepairStatusBadge';
import RepairHistory from '../../components/repairs/RepairHistory';
import RepairPhotoGallery from '../../components/repairs/RepairPhotoGallery';
import styles from './RepairDetails.module.css';

const RepairDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [repair, setRepair] = useState<Repair | null>(null);
  const [history, setHistory] = useState<RepairHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' as '' | 'error' | 'success' | 'info' });

  const [statusDraft, setStatusDraft] = useState<RepairStatus>('received');
  const [savingStatus, setSavingStatus] = useState(false);

  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [r, h] = await Promise.all([getRepair(id), getRepairHistory(id)]);
      setRepair(r);
      setHistory(h);
      setStatusDraft(r.status);
      setNotesDraft(r.repair_notes ?? '');
    } catch {
      setError('Could not load this repair job. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(async () => {
    if (!id) return;
    const [r, h] = await Promise.all([getRepair(id), getRepairHistory(id)]);
    setRepair(r);
    setHistory(h);
    setStatusDraft(r.status);
  }, [id]);

  const handleStatusSave = async (requestedStatus = statusDraft) => {
    if (!repair || savingStatus) return;
    if (requestedStatus === repair.status) return;

    if (requestedStatus === 'cancelled' || requestedStatus === 'completed') {
      const label = STATUS_LABELS[requestedStatus];
      if (!window.confirm(`Mark this job as "${label}"? This updates the customer-facing status.`)) {
        return;
      }
    }

    setSavingStatus(true);
    setMessage({ text: '', type: '' });
    try {
      await updateRepairStatus(repair.id, requestedStatus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      setMessage({ text: msg, type: 'error' });
      setStatusDraft(repair.status); // preserve record on failure
      setSavingStatus(false);
      return;
    }
    // The write succeeded. A refetch failure here must NOT be reported as a
    // status-update failure (the DB is already updated).
    try {
      await refetch();
      setMessage({ text: 'Status updated.', type: 'success' });
    } catch {
      setMessage({ text: 'Status updated, but refreshing the view failed. Reload to see the latest.', type: 'success' });
    } finally {
      setSavingStatus(false);
    }
  };

  const nextStatus: RepairStatus | null = (() => {
    switch (repair?.status) {
      case 'received': return 'diagnosing';
      case 'diagnosing':
      case 'waiting_for_approval': return 'in_repair';
      case 'in_repair': return 'ready';
      case 'ready': return 'completed';
      default: return null;
    }
  })();

  const advanceStatus = () => {
    if (!nextStatus) return;
    setStatusDraft(nextStatus);
    void handleStatusSave(nextStatus);
  };

  const handleNotesSave = async () => {
    if (!repair || savingNotes) return;
    setSavingNotes(true);
    setMessage({ text: '', type: '' });
    try {
      await updateRepairNotes(repair.id, notesDraft);
      setMessage({ text: 'Notes saved.', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save notes.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.muted}>Loading repair job…</p>
        </div>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.error}>{error || 'Repair not found.'}</div>
          <Link to="/admin/repairs" className={styles.secondaryButton}>
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>{repair.job_number}</h2>
            <RepairStatusBadge status={repair.status} />
          </div>
          <Link to="/admin/repairs" className={styles.secondaryButton}>
            Back to list
          </Link>
        </div>

        {message.text && (
          <div className={message.type === 'error' ? styles.error : styles.success}>
            {message.text}
          </div>
        )}

        <div className={styles.infoGrid}>
          <div>
            <span className={styles.muted}>Customer</span>
            <div>{repair.customers?.full_name ?? '—'}</div>
            {repair.customers?.phone && (
              <a className={styles.contactLink} href={`tel:${repair.customers.phone}`}>
                Call {repair.customers.phone}
              </a>
            )}
          </div>
          <div>
            <span className={styles.muted}>Device</span>
            <div>
              {repair.devices ? `${repair.devices.brand} ${repair.devices.model}` : '—'}
            </div>
          </div>
          <div>
            <span className={styles.muted}>Created</span>
            <div>{new Date(repair.created_at).toLocaleString()}</div>
          </div>
          {repair.completed_at && (
            <div>
              <span className={styles.muted}>Completed</span>
              <div>{new Date(repair.completed_at).toLocaleString()}</div>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <span className={styles.muted}>Reported problem / required work</span>
          <p className={styles.readonlyText}>{repair.required_work}</p>
        </div>
      </div>

      {/* STATUS */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Update Status</h3>
        {nextStatus && (
          <button className={styles.primaryButton} disabled={savingStatus} onClick={advanceStatus}>
            {savingStatus ? 'Saving…' : `Advance to ${STATUS_LABELS[nextStatus]}`}
          </button>
        )}
        <div className={styles.statusRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="status-select">Status</label>
            <select
              id="status-select"
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as RepairStatus)}
            >
              {REPAIR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            className={styles.primaryButton}
            disabled={savingStatus || statusDraft === repair.status}
            onClick={() => void handleStatusSave()}
          >
            {savingStatus ? 'Saving…' : 'Save status'}
          </button>
        </div>
      </div>

      {/* NOTES */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Repair Notes</h3>
        <div className={styles.inputGroup}>
          <label htmlFor="notes">Internal notes</label>
          <textarea
            id="notes"
            rows={4}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
        </div>
        <button className={styles.primaryButton} disabled={savingNotes} onClick={handleNotesSave}>
          {savingNotes ? 'Saving…' : 'Save notes'}
        </button>
      </div>

      {/* PHOTOS */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Photos</h3>
        <RepairPhotoGallery
          repairId={repair.id}
          uploadedBy={user?.id ?? ''}
          onMessage={(text, type) => setMessage({ text, type })}
        />
      </div>

      {/* HISTORY */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Status History</h3>
        <RepairHistory entries={history} />
      </div>
    </div>
  );
};

export default RepairDetails;
