import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container animate-fade-in" style={{ padding: '8rem 1rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <SEO title="404 - Page Not Found" />
      <h1 style={{ fontSize: '6rem', color: 'var(--primary-color)', marginBottom: '1rem', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>Page Not Found</h2>
      <p style={{ color: '#666', marginBottom: '2rem', maxWidth: '400px', fontSize: '1.1rem' }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary">Return to Homepage</Link>
    </div>
  );
};

export default NotFound;
