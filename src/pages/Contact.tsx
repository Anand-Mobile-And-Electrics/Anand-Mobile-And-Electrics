import { useState } from 'react';
import styles from './Contact.module.css';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import SEO from '../components/SEO';

const SHOP_EMAIL = 'aks0317electronics@gmail.com';

const Contact = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Mobile Repair');
  const [messageText, setMessageText] = useState('');
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedMsg = messageText.trim();

    if (!trimmedName || !trimmedPhone || !trimmedMsg) {
      setStatus({ text: 'Please fill in your name, phone number, and message.', type: 'error' });
      return;
    }
    if (!/^[+\d][\d\s().-]{6,}$/.test(trimmedPhone)) {
      setStatus({ text: 'Please enter a valid phone number.', type: 'error' });
      return;
    }

    // Free, no-backend method: open the visitor's own email client with a
    // pre-filled message to the shop. No secrets, no third-party service.
    const subject = `Enquiry: ${service} — ${trimmedName}`;
    const body =
      `Name: ${trimmedName}\n` +
      `Phone: ${trimmedPhone}\n` +
      `Service required: ${service}\n\n` +
      `Message:\n${trimmedMsg}`;
    const mailto = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    setStatus({
      text: `Your email app should now open with your message ready to send. If it does not, please email us directly at ${SHOP_EMAIL}.`,
      type: 'success',
    });
  };

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
                   <p><a href="https://www.google.com/maps/search/?api=1&query=11-12%20Kaushal%20Park%2C%20Talangpur%20Road%2C%20Sachin%2C%20Surat%20394230" target="_blank" rel="noreferrer">11-12 Kaushal Park, Opp. Shivanjali Society,<br />Talangpur Road, Sachin,<br />Surat, Gujarat, India 394230</a></p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Phone size={24} />
                </div>
                <div>
                  <h4>Call Us</h4>
                   <p><a href="tel:+919725569604">+91 97255 69604</a></p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Mail size={24} />
                </div>
                <div>
                  <h4>Email Us</h4>
                  <p><a href={`mailto:${SHOP_EMAIL}`}>{SHOP_EMAIL}</a></p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.iconWrap}>
                  <Clock size={24} />
                </div>
                <div>
                  <h4>Working Hours</h4>
                  <p>Everyday: 7:30 AM - 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formCol}>
            <form className={styles.contactForm} onSubmit={handleSubmit}>
              <h3>Send us a message</h3>

              <div className={styles.formGroup}>
                <label htmlFor="contact-name">Name</label>
                <input id="contact-name" type="text" autoComplete="name" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required aria-required="true" />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contact-phone">Phone Number</label>
                <input id="contact-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Your Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-required="true" />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contact-service">Service Required</label>
                <select id="contact-service" value={service} onChange={(e) => setService(e.target.value)}>
                  <option>Mobile Repair</option>
                  <option>Mobile Accessories</option>
                  <option>Electrical &amp; Electronics</option>
                  <option>Money Transfer &amp; AEPS</option>
                  <option>Recharge &amp; DTH</option>
                  <option>PAN Card &amp; Voter ID</option>
                  <option>Xerox &amp; Lamination</option>
                  <option>Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" rows={4} placeholder="How can we help you?" value={messageText} onChange={(e) => setMessageText(e.target.value)} required aria-required="true"></textarea>
              </div>

              {status && (
                <p role="status" style={{ color: status.type === 'error' ? '#B31932' : '#166534', fontSize: '0.9rem' }}>
                  {status.text}
                </p>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
            </form>
          </div>

        </div>
      </section>

      <section className={styles.mapSection}>
        <div className="container">
          <div className={styles.mapContainer}>
            <iframe
              src="https://maps.google.com/maps?q=11-12%20Kaushal%20Park,%20Opposite%20Shivanjali%20Society,%20Talangpur%20Road,%20Sachin,%20Surat,%20Gujarat%20394230&t=&z=15&ie=UTF8&iwloc=&output=embed"
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
