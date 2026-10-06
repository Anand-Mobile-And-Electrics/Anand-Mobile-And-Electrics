import { Link, NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.jpg" alt="Anand Mobile & Electrics" className={styles.logo} />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ANAND</span>
            <span className={styles.brandSubtitle}>MOBILE & ELECTRICS</span>
          </div>
        </Link>
        
        <button 
          className={styles.menuIcon} 
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={28} aria-hidden="true" /> : <Menu size={28} aria-hidden="true" />}
        </button>

        <ul id="mobile-navigation" className={`${styles.navLinks} ${isOpen ? styles.active : ''}`}>
          <li><NavLink to="/" onClick={() => setIsOpen(false)} className={({isActive}) => isActive ? styles.activeLink : ''}>Home</NavLink></li>
          <li><NavLink to="/services" onClick={() => setIsOpen(false)} className={({isActive}) => isActive ? styles.activeLink : ''}>Services</NavLink></li>
          <li><NavLink to="/products" onClick={() => setIsOpen(false)} className={({isActive}) => isActive ? styles.activeLink : ''}>Products</NavLink></li>
          <li><NavLink to="/about" onClick={() => setIsOpen(false)} className={({isActive}) => isActive ? styles.activeLink : ''}>About</NavLink></li>
          <li>
            <Link to="/contact" className="btn btn-primary" onClick={() => setIsOpen(false)}>
              Contact Store
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
