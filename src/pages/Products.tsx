import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import { PackageSearch, Phone } from 'lucide-react';

const Products = () => {
  return (
    <div className="animate-fade-in">
      <SEO 
        title="Products" 
        description="Discover our range of mobile accessories and electrical appliances at Anand Mobile & Electrics." 
        canonical="/products"
      />
      
      <section style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Our Products</h1>
          <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}>
            High-quality electronics and accessories for your daily needs.
          </p>
        </div>
      </section>

      <section className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div style={{ 
          maxWidth: '500px', 
          margin: '0 auto', 
          padding: '3rem', 
          backgroundColor: '#f9fafb', 
          borderRadius: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: '#e0e7ff', 
            color: 'var(--primary-color)',
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 2rem'
          }}>
            <PackageSearch size={40} />
          </div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Online Catalog Coming Soon</h2>
          <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: 1.6 }}>
            Visit our shop for a wide range of products including mobile accessories (chargers, cables, covers, earphones, earbuds, neckbands), fans, coolers, speakers, bulbs, decorative lights, electrical wires, boards, and mixer-related items. We are currently working on bringing our product catalog online.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/contact" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Phone size={20} /> Call for Availability
            </Link>
            <Link to="/contact" className="btn btn-outline">Visit Our Store</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;
