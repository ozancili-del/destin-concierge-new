import styles from "../styles/SiteFooter.module.css";

const mapUrl = "https://www.google.com/maps/search/?api=1&query=Pelican%20Beach%20Resort%2C%201002%20US-98%2C%20Destin%2C%20FL%2032541";

export default function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.brand}>
      <strong>Destin Condo Getaways</strong>
      <p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p>
      <a href="tel:+19723574262">(972) 357-4262</a>
      <a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a>
      <a href="/">www.destincondogetaways.com</a>
      <a href={mapUrl} target="_blank" rel="noopener noreferrer"><address>1002 US-98<br />Destin, FL 32541</address></a>
      <a href="https://www.facebook.com/DestinCondoGetaways" target="_blank" rel="noopener noreferrer">Facebook</a>
    </div>
    <div><strong>Stay</strong><a href="/destin-vacation-rentals-by-owner">Compare our condos</a><a href="/pelican-beach-resort-unit-707">Unit 707</a><a href="/pelican-beach-resort-unit-1006">Unit 1006</a><a href="/destin-condo-photo-gallery">Photo gallery</a><a href="/pelican-beach-resort-condo-virtual-tours">Virtual tours</a><a href="/availability">Live availability &amp; booking</a><a href="/destin-condo-rental-reviews">Reviews</a></div>
    <div><strong>Plan</strong><a href="/destin-ai-concierge">Destin AI concierge</a><a href="/destin-vacation-itinerary-planner">Trip planner</a><a href="/destin-car-rentals">Flights &amp; rental cars</a><a href="/destin-activities">Activities</a><a href="/destin-condo-deals">Beach deals</a><a href="/destin-snowbird-rentals">Snowbird stays</a></div>
    <div><strong>Destin Blog &amp; Guides</strong><a className={styles.blogButton} href="/blog">View all Destin blog articles →</a><a href="/blog/destinweather">Weather</a><a href="/blog/best-beaches-destin">Beaches</a><a href="/blog/best-restaurants-destin">Restaurants</a><a href="/blog/destin-events">Events</a><a href="/blog/destin-fireworks-2026">Fireworks</a></div>
    <div><strong>Guest Information</strong><a href="/guest-guide#policies">Policies</a><a href="/destin-condo-rental-faq">FAQ</a><a href="/about">About &amp; contact</a><a href="/privacy">Privacy</a><a href="/map">Destin map</a><a href="/beach-cam">Live beach cam</a></div>
    <div className={styles.legal}>© 2026 Destin Condo Getaways. All rights reserved.</div>
  </footer>;
}
