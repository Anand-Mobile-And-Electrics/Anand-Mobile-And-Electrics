import styles from './About.module.css';
import SEO from '../components/SEO';

const About = () => {
  return (
    <div className="animate-fade-in">
      <SEO 
        title="About Us" 
        description="Learn about Anand Mobile & Electrics, your local experts in technology, repair, and digital services in Sachin, Surat."
        canonical="/about"
      />
      <section className={styles.aboutHero}>
        <div className="container">
          <h1 className="section-title">About Anand Mobile & Electrics</h1>
          <p className="section-subtitle">Your local experts in technology, repair, and digital services.</p>
        </div>
      </section>

      <section className={styles.aboutContent}>
        <div className={`container ${styles.grid}`}>
          <div className={styles.imageCol}>
            <img src="/logo.jpg" alt="Anand Mobile & Electrics Logo" className={styles.storeImage} />
          </div>
          <div className={styles.textCol}>
            <h2>Who We Are</h2>
            <p>
              Located in the heart of Sachin, Surat, <strong>Anand Mobile & Electrics</strong> is committed to providing reliable, professional, and accessible technology services to our local community.
            </p>
            <p>
              We are a comprehensive service hub. Whether you need an urgent smartphone repair, essential electrical supplies for your home, or assistance with digital government services and money transfers, we are equipped to help you efficiently.
            </p>
            
            <div className={styles.stats}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>Quality</span>
                <span className={styles.statLabel}>Service</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>Reliable</span>
                <span className={styles.statLabel}>Repairs</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>Local</span>
                <span className={styles.statLabel}>Community Focused</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
