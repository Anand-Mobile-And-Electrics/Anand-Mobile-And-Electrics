import styles from './Contact.module.css';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import SEO from '../components/SEO';

const Contact = () => {
  return (
    <div className="animate-fade-in">
      <SEO 
        title="Contact Us" 
        description="Get in touch with Anand Mobile & Electrics in Sachin, Surat. We're here to help with mobile repairs, digital services, and electrical sales."
        canonical="/contact"
      />
      <section className={styles.contactHero}>
        <div className="container">
          <h1 className="section-title">Contact Us</h1>
          <p className="section-subtitle">We're here to help. Reach out to us for any queries or visit our store.</p>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={`container ${styles.grid}`}>
          
          <div className={styles.infoCol}>
            <h2>Get in Touch</h2>
            <p className={styles.infoDesc}>
              Whether you need a quick repair quote, want to know about our products, or require digital assistance, we are ready to assist.
            </p>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h4>Visit Us</h4>
                  <p>11-12 Kaushal Park, Opp. Shivanjali Society,<br />Talangpore Road, Sachin,<br />Surat, Gujarat, India</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Phone size={24} />
                </div>
                <div>
                  <h4>Call Us</h4>
                  <p>+91 97255 69604<br /><em>(Pending Owner Confirmation)</em></p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Mail size={24} />
                </div>
                <div>
                  <h4>Email Us</h4>
                  <p>aks0317electronics@gmail.com</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Clock size={24} />
                </div>
                <div>
                  <h4>Working Hours</h4>
                  <p>Everyday: 7:30 AM - 10:00 PM<br /><em>(Pending Owner Confirmation)</em></p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formCol}>
            <form className={styles.contactForm}>
              <h3>Send us a message</h3>
              
              <div className={styles.formGroup}>
                <label>Name</label>
                <input type="text" placeholder="Your Name" />
              </div>
              
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input type="tel" placeholder="Your Phone Number" />
              </div>

              <div className={styles.formGroup}>
                <label>Service Required</label>
                <select>
                  <option>Mobile Repair</option>
                  <option>Mobile Accessories</option>
                  <option>Electrical & Electronics</option>
                  <option>Money Transfer & AEPS</option>
                  <option>Recharge & DTH</option>
                  <option>PAN Card & Voter ID</option>
                  <option>Xerox & Lamination</option>
                  <option>Other</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea rows={4} placeholder="How can we help you?"></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
            </form>
          </div>

        </div>
      </section>

      <section className={styles.mapSection}>
        <div className="container">
          <div className={styles.mapContainer}>
            <iframe 
              src="https://maps.google.com/maps?q=11-12%20Kaushal%20Park,%20Opposite%20Shivanjali%20Society,%20Talangpore%20Road,%20Sachin,%20Surat,%20Gujarat%20394230&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%" 
              height="450" 
              style={{ border: 0, borderRadius: '12px' }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Anand Mobile & Electrics Location"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
