import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from './Home.module.css';
import SEO from '../components/SEO';
import { services } from '../data/services';

const Home = () => {
  // Select top categories to highlight on homepage
  const highlightServices = services.filter(s => 
    ['mobile-repairing', 'digital-financial-services', 'government-e-governance', 'electrical-repairing'].includes(s.id)
  );

  return (
    <div className="animate-fade-in">
      <SEO 
        title="Home" 
        canonical="/"
      />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>Sachin, Surat</span>
            <h1 className={styles.heroTitle}>
              Technology, Electronics & <br />
              <span className={styles.highlight}>Digital Services</span>
            </h1>
            <p className={styles.heroText}>
              Mobile repair, accessories, electrical and electronic products, documentation, recharge, and digital financial services in one local shop.
            </p>
            <div className={styles.heroActions}>
              <Link to="/services" className="btn btn-primary">
                Explore Services <ArrowRight size={20} className={styles.btnIcon} />
              </Link>
              <Link to="/contact" className="btn btn-outline">
                Visit Our Store
              </Link>
            </div>
          </div>
          <div className={styles.heroImageWrapper}>
            <img src="/logo.jpg" alt="Anand Mobile & Electrics Logo" className={styles.heroImage} />
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className={styles.servicesSection}>
        <div className="container">
          <h2 className="section-title">What We Do</h2>
          <p className="section-subtitle">Comprehensive solutions for your daily technology and digital requirements.</p>
          
          <div className={styles.serviceGrid}>
            {highlightServices.map((service, index) => {
              const Icon = service.icon;
              const isAlternate = index % 2 !== 0;
              return (
                <div key={service.id} className={styles.serviceCard}>
                  <div className={styles.serviceIconWrap} style={isAlternate ? { backgroundColor: 'rgba(30,102,180,0.1)', color: 'var(--brand-blue)' } : {}}>
                    <Icon size={32} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.shortDescription}</p>
                  <Link to={`/services/${service.id}`} className={styles.serviceLink} style={isAlternate ? { color: 'var(--brand-blue)' } : {}}>
                    Learn more <ArrowRight size={16} />
                  </Link>
                </div>
              )
            })}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
             <Link to="/services" className="btn btn-outline">View All Services</Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section style={{ backgroundColor: '#f9fafb', padding: '5rem 1rem' }}>
        <div className="container">
          <h2 className="section-title">Why Choose Us</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
             <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Multiple Services</h3>
                <p style={{ color: '#666' }}>Mobile repair, accessories, electrical and electronic products, documentation, recharge, and digital financial services in one local shop.</p>
             </div>
             <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Convenient Local Service</h3>
                <p style={{ color: '#666' }}>Conveniently located in Sachin, Surat, for local customers who want to visit the shop.</p>
             </div>
             <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Professional Approach</h3>
                <p style={{ color: '#666' }}>Clear communication, careful repair work, and straightforward local services.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Location CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaBox}>
            <h2>Visit Anand Mobile & Electrics</h2>
            <p>11-12 Kaushal Park, Opposite Shivanjali Society, Talangpore Road, Sachin, Surat, Gujarat, India</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link to="/contact" className="btn btn-primary" style={{ backgroundColor: 'var(--white)', color: 'var(--brand-red)', marginRight: '1rem' }}>
                Get Directions
              </Link>
              <Link to="/contact" className="btn btn-outline" style={{ borderColor: 'var(--white)', color: 'var(--white)' }}>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
