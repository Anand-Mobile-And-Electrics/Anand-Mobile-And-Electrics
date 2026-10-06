import { useParams, Link } from 'react-router-dom';
import { services } from '../data/services';
import SEO from '../components/SEO';
import { ChevronLeft } from 'lucide-react';

const ServiceDetail = () => {
  const { id } = useParams();
  const service = services.find(s => s.id === id);

  if (!service) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <SEO title="Service Not Found" />
        <h2>Service Not Found</h2>
        <p>The service you are looking for does not exist.</p>
        <Link to="/services" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to Services</Link>
      </div>
    );
  }

  const Icon = service.icon;

  return (
    <div className="animate-fade-in">
      <SEO 
        title={service.title} 
        description={service.shortDescription}
        canonical={`/services/${service.id}`}
      />
      
      <section style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '4rem 1rem' }}>
        <div className="container">
          <Link to="/services" style={{ color: 'var(--bg-light)', display: 'inline-flex', alignItems: 'center', marginBottom: '2rem', textDecoration: 'none', fontWeight: 500 }}>
            <ChevronLeft size={20} /> Back to Services
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%', display: 'flex' }}>
              <Icon size={32} />
            </div>
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{service.title}</h1>
          </div>
          <p style={{ fontSize: '1.2rem', maxWidth: '600px', opacity: 0.9 }}>{service.shortDescription}</p>
        </div>
      </section>

      <section className="container" style={{ padding: '4rem 1rem' }}>
        <h2 style={{ marginBottom: '2rem', color: 'var(--text-dark)' }}>What We Offer</h2>
        <ul style={{ listStyleType: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {service.items.map((item, index) => (
            <li key={index} style={{ backgroundColor: 'var(--bg-light)', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eaeaea', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--secondary-color)', borderRadius: '50%' }}></div>
              <span style={{ fontWeight: 500 }}>{item}</span>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '4rem', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Need this service?</h3>
          <p style={{ marginBottom: '2rem', color: '#666' }}>Visit our store in Sachin or contact us for more information.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary">Contact Us</Link>
            <Link to="/contact" className="btn btn-outline">Get Directions</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetail;
