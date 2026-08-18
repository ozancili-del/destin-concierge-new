import SiteButton from "./SiteButton";
import styles from "../styles/SiteHeader.module.css";
import { Parisienne, Sacramento } from "next/font/google";

const desktopSlogan = Sacramento({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const mobileSlogan = Parisienne({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const condoLinks = [
  ["Vacation Rentals", "/destin-vacation-rentals-by-owner"],
  ["Unit 707", "/condos/unit-707"],
  ["Unit 1006", "/condos/unit-1006"],
  ["Virtual Tours", "/virtual-tours"],
];

export default function SiteHeader({ availabilityHref = "/availability" }) {
  return <header className={styles.header}>
    <a className={styles.brand} href="/">
      <img className={styles.logo} src="/logo.webp" width="360" height="217" alt="Destin Condo Getaways" />
      <span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span>
    </a>

    <p className={styles.slogan}>
      <span className={`${styles.desktopSlogan} ${desktopSlogan.className}`}>Where Destin stays with you</span>
      <span className={`${styles.mobileSlogan} ${mobileSlogan.className}`} aria-hidden="true">Where Destin stays with you…</span>
    </p>

    <nav className={styles.desktopNav} aria-label="Main navigation">
      <details className={styles.dropdown}>
        <summary>Condos</summary>
        <div>{condoLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div>
      </details>
      <a href="/resort">The Resort</a>
      <a href="/gallery">Gallery</a>
      <a href="/blog">Destin Guide</a>
      <a href="/beach-cam">Beach Cam</a>
      <a href="/deals">Deals</a>
      <a href="/destin-ai-concierge">Live Chat</a>
    </nav>

    <SiteButton href={availabilityHref} variant="primary" size="compact">Live availability</SiteButton>

    <details className={styles.mobileMenu}>
      <summary aria-label="Menu">Menu</summary>
      <nav aria-label="Mobile navigation">
        <strong>Condos</strong>
        {condoLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        <a href="/resort">The Resort</a>
        <a href="/gallery">Photo Gallery</a>
        <a href="/blog">Destin Guide</a>
        <a href="/beach-cam">Beach Cam</a>
        <a href="/deals">Deals</a>
        <a href="/destin-ai-concierge">Live Chat</a>
      </nav>
    </details>
  </header>;
}
