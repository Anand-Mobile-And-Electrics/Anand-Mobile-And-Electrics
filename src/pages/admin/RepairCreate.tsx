import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Technician } from '../../services/repairs';
import { listTechnicians } from '../../services/repairs';
import RepairForm from '../../components/repairs/RepairForm';
import styles from './RepairCreate.module.css';

const RepairCreate = () => {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [message, setMessage] = useState({ text: '', type: '' as '' | 'error' | 'success' | 'info' });

  useEffect(() => {
    listTechnicians()
      .then(setTechnicians)
      .catch(() => setMessage({ text: 'Could not load staff list.', type: 'error' }));
  }, []);

  const handleMessage = (text: string, type: 'error' | 'success' | 'info') => {
    setMessage({ text, type });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>New Repair Job</h2>
          <Link to="/admin/repairs" className={styles.secondaryButton}>
            Back to list
          </Link>
        </div>

        {message.text && (
          <div className={message.type === 'error' ? styles.error : styles.success}>
            {message.text}
          </div>
        )}

        <RepairForm
          technicians={technicians}
          onMessage={handleMessage}
          onCreated={(jobNumber, repairId) => {
            setMessage({ text: `Created ${jobNumber}. Redirecting…`, type: 'success' });
            navigate(`/admin/repairs/${repairId}`);
          }}
        />
      </div>
    </div>
  );
};

export default RepairCreate;
