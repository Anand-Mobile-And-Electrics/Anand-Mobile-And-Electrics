import { useEffect, useState, useCallback } from 'react';
import type { RepairPhoto } from '../../services/repairs';
import { listRepairPhotos, uploadRepairPhoto, getSignedPhotoUrl } from '../../services/repairs';
import styles from '../../pages/admin/RepairDetails.module.css';

interface Props {
  repairId: string;
  uploadedBy: string;
  onMessage: (text: string, type: 'error' | 'success' | 'info') => void;
}

const RepairPhotoGallery = ({ repairId, uploadedBy, onMessage }: Props) => {
  const [photos, setPhotos] = useState<RepairPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listRepairPhotos(repairId);
      setPhotos(list);
      const entries = await Promise.all(
        list.map(async (p) => {
          try {
            return [p.id, await getSignedPhotoUrl(p.storage_path, 3600)] as const;
          } catch {
            return [p.id, ''] as const;
          }
        }),
      );
      setUrls(Object.fromEntries(entries));
    } catch {
      setError('Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, [repairId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (uploading) return;
    if (!file.type.startsWith('image/')) {
      onMessage('Please choose an image file (JPEG, PNG, or WebP).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onMessage('Photo is too large. Choose an image under 10 MB.', 'error');
      return;
    }
    if (!uploadedBy) {
      onMessage('Your account is not ready for photo uploads. Sign in again and retry.', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadRepairPhoto(repairId, file, uploadedBy);
      onMessage('Photo uploaded.', 'success');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Photo upload failed.';
      onMessage(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className={styles.inputGroup}>
        <label htmlFor="photo-upload">Add photo</label>
        <input
          id="photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={uploading}
          onChange={handleFile}
        />
        {uploading && <span className={styles.muted}>Compressing and uploading…</span>}
      </div>

      {loading && <p className={styles.muted}>Loading photos…</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && photos.length === 0 && (
        <p className={styles.muted}>No photos yet.</p>
      )}

      <div className={styles.photoGrid}>
        {photos.map((p) =>
          urls[p.id] ? (
            <a key={p.id} href={urls[p.id]} target="_blank" rel="noreferrer">
              <img className={styles.photoThumb} src={urls[p.id]} alt="Repair" loading="lazy" />
            </a>
          ) : (
            <div key={p.id} className={styles.photoThumbFallback}>
              Unavailable
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default RepairPhotoGallery;
