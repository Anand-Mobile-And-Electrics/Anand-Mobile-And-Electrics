import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PublicLayout from './components/PublicLayout';
import { AuthProvider } from './contexts/AuthContext';
import AdminLayout from './components/admin/AdminLayout';
import DemoBanner from './components/DemoBanner';

// Route-level code splitting: each page is loaded on demand so the initial
// public bundle stays small and the heavy admin/inventory deps (barcode
// scanner, image compression) are only fetched when staff open those screens.
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const Products = lazy(() => import('./pages/Products'));
const Contact = lazy(() => import('./pages/Contact'));
const SpinWheel = lazy(() => import('./pages/SpinWheel'));
const OfferManagement = lazy(() => import('./pages/OfferManagement'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Inventory = lazy(() => import('./pages/admin/Inventory'));
const Repairs = lazy(() => import('./pages/admin/Repairs'));
const RepairCreate = lazy(() => import('./pages/admin/RepairCreate'));
const RepairDetails = lazy(() => import('./pages/admin/RepairDetails'));

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: '#6b7280' }}>
    <p>Loading…</p>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <DemoBanner />
        <Router>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Routes (Current Website) */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="/owner/spin-wheel" element={<SpinWheel />} />
              <Route path="/admin/spin-wheel" element={<SpinWheel />} />
              <Route path="/admin/spin-wheel/offers" element={<OfferManagement />} />

              {/* Admin/Staff Routes */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="repairs" element={<Repairs />} />
                <Route path="repairs/new" element={<RepairCreate />} />
                <Route path="repairs/:id" element={<RepairDetails />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
