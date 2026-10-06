import { Link } from 'react-router-dom';
import styles from './Services.module.css';
import { ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { services } from '../data/services';
import SEO from '../components/SEO';

const Services = () => {
  return (
    <div className="animate-fade-in">
      <SEO 
        title="Our Services" 
        description="Comprehensive digital, electronic, and hardware solutions delivered with expertise and trust at Anand Mobile & Electrics."
        canonical="/services"
      />

      <section className={styles.servicesHero} style={{ padding: '4rem 1rem', textAlign: 'center', backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <div className="container">
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Our Services</h1>
          <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}>
            Comprehensive digital, electronic, and hardware solutions delivered with expertise and trust.
          </p>
        </div>
      </section>

      <section className={styles.serviceDetail} style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {services.map((service, index) => {
            const Icon = service.icon;
            const isAlternate = index % 2 !== 0;
            return (
              <div key={service.id} className={styles.serviceBlock} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div className={styles.blockIcon} style={{ backgroundColor: isAlternate ? 'rgba(30,102,180,0.1)' : 'var(--primary-color)', color: isAlternate ? 'var(--secondary-color)' : 'white', padding: '1rem', borderRadius: '12px' }}>
                    <Icon size={32} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>{service.title}</h2>
                    <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.6 }}>{service.shortDescription}</p>
                    
                    <ul className={styles.featureList} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                      {service.items.slice(0, 4).map((item, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                          <CheckCircle2 size={16} style={{ color: isAlternate ? 'var(--secondary-color)' : 'var(--primary-color)' }} /> 
                          {item}
                        </li>
                      ))}
                      {service.items.length > 4 && (
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#666', fontStyle: 'italic' }}>
                          + {service.items.length - 4} more
                        </li>
                      )}
                    </ul>

                    <Link to={`/services/${service.id}`} className={`btn ${isAlternate ? 'btn-outline' : 'btn-primary'}`} style={{ display: 'inline-block' }}>
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </section>

      <section className={styles.whyUs} style={{ backgroundColor: '#f9fafb', padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--text-dark)' }}>Why Choose Us?</h2>
          <div className={styles.whyGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div className={styles.whyCard} style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <ShieldCheck size={40} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Multiple Services</h4>
              <p style={{ color: '#666' }}>All your electronics, repairs, and digital needs in one convenient location.</p>
            </div>
            <div className={styles.whyCard} style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Clock size={40} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Professional Approach</h4>
              <p style={{ color: '#666' }}>Technology-focused assistance and expert repairs you can rely on.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
