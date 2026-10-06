import { Link } from 'react-router-dom';
import styles from './Footer.module.css';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const InstagramIcon = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Instagram" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Facebook" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const YouTubeIcon = ({ size = 20, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="YouTube" {...props}>
    <path d="M2.5 7.1C2.1 8.4 2 10.2 2 12s.1 3.6.5 4.9a4 4 0 0 0 2.8 2.8C6.6 20 12 20 12 20s5.4 0 6.7-.3a4 4 0 0 0 2.8-2.8c.4-1.3.5-3.1.5-4.9s-.1-3.6-.5-4.9a4 4 0 0 0-2.8-2.8C17.4 4 12 4 12 4s-5.4 0-6.7.3a4 4 0 0 0-2.8 2.8z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className="container">
          <div className={styles.grid}>
            
            <div className={styles.col}>
              <div className={styles.brand}>
                <span className={styles.brandTitle}>ANAND</span>
                <span className={styles.brandSubtitle}>MOBILE & ELECTRICS</span>
              </div>
              <p className={styles.aboutText}>
                Your local technology and electronics shop in Sachin, Surat, offering mobile repair, accessories, electrical & electronic products, and digital services.
              </p>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colTitle}>Quick Links</h4>
              <ul className={styles.linksList}>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colTitle}>Our Services</h4>
              <ul className={styles.linksList}>
                <li><Link to="/services">Mobile Repair</Link></li>
                <li><Link to="/services">Mobile Accessories</Link></li>
                <li><Link to="/services">Electrical & Electronics</Link></li>
                <li><Link to="/services">Money Transfer & AEPS</Link></li>
              </ul>
            </div>

            <div className={styles.col}>
              <h4 className={styles.colTitle}>Contact Info</h4>
              <ul className={styles.contactList}>
                <li>
                  <MapPin size={18} className={styles.icon} />
                  <span>11-12 Kaushal Park, Opp. Shivanjali Society, Talangpore Road, Sachin, Surat</span>
                </li>
                <li>
                  <Phone size={18} className={styles.icon} />
                  <span>+91 97255 69604 <em>(Pending Owner Confirmation)</em></span>
                </li>
                <li>
                  <Mail size={18} className={styles.icon} />
                  <span>aks0317electronics@gmail.com</span>
                </li>
                <li>
                  <Clock size={18} className={styles.icon} />
                  <span>Everyday: 7:30 AM - 10:00 PM<br/><em>(Pending Owner Confirmation)</em></span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className={styles.socialRow}>
            <div className={styles.socialLinks}>
              <a href="https://instagram.com/anandmobile.electrics" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <InstagramIcon size={20} />
                <span>Instagram</span>
              </a>
              <a href="https://facebook.com/anandmobile.electrics" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <FacebookIcon size={20} />
                <span>Facebook</span>
              </a>
              <a href="https://youtube.com/@anandmobile.electrics" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <YouTubeIcon size={20} />
                <span>YouTube</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.footerBottom}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Anand Mobile & Electrics. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
