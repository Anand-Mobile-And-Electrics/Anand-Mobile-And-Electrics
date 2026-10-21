import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Package, Wrench, LogOut, Gift } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const { session, isLoading, signOut, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    // Redirect to login if unauthenticated
    return <Navigate to="/admin/login" replace />;
  }

  if (!role || !['owner', 'manager', 'technician'].includes(role)) {
    return <div className="adminAccessDenied"><h1>Staff profile unavailable</h1><p>Your staff profile is not configured. Please contact the owner.</p><button onClick={() => void signOut()}>Log out</button></div>;
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/inventory', label: 'Inventory', icon: Package },
    { to: '/admin/repairs', label: 'Repairs', icon: Wrench },
    ...(role === 'owner' || role === 'manager' ? [{ to: '/admin/spin-wheel', label: 'Spin Wheel', icon: Gift }] : []),
  ];

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div className="adminBrand">
          <span className="adminBrandMark">A</span>
          <div><strong>Anand Mobile &amp; Electrics</strong><small>Staff workspace</small></div>
        </div>
        <div className="adminHeaderActions">
          <span className="adminRole">{role ?? 'Staff'}</span>
          <button className="adminLogout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={17} /> <span>Sign out</span></button>
        </div>
      </header>
      <nav className="adminNav" aria-label="Staff navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'adminNavLink active' : 'adminNavLink'}>
            <Icon size={19} /> <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="adminMain">
        <div className="adminBreadcrumb" aria-label="Current section">Staff / {location.pathname === '/admin' ? 'Dashboard' : location.pathname.split('/')[2] ?? 'Workspace'}</div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
