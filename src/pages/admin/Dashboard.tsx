import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user, role, signOut } = useAuth();

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <div>
          <h1>Staff Dashboard</h1>
          <p>Welcome, {user?.email}</p>
        </div>
        <button onClick={signOut} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <div className={styles.contentCard}>
        <h2>Your Identity</h2>
        <div className={styles.infoRow}>
          <span className={styles.label}>User ID:</span>
          <span className={styles.value}>{user?.id}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Role:</span>
          <span className={styles.value}>
            {role ? <span className={styles.badge}>{role.toUpperCase()}</span> : 'No Role Assigned'}
          </span>
        </div>
      </div>
      
      <div className={styles.contentCard}>
        <h2>Inventory Management</h2>
        <p>Access the inventory management system to scan barcodes, receive stock, and record product sales or usage.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/admin/inventory" className={styles.logoutButton} style={{ textDecoration: 'none', display: 'inline-block' }}>
            Open Inventory
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
