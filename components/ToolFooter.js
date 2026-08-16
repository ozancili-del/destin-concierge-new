export default function ToolFooter() {
  return <footer className="dcg-tool-footer">
    <div className="dcg-tool-brand"><strong>Destin Condo Getaways</strong><p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a><address>1002 US-98<br/>Destin, FL 32541</address></div>
    <div><strong>Stay</strong><a href="/condos/unit-707">Unit 707</a><a href="/condos/unit-1006">Unit 1006</a><a href="/#availability">Live availability</a><a href="/reviews">Reviews</a><a href="/why-book-direct">Why book direct</a></div>
    <div><strong>Plan</strong><a href="/trip-planner">Trip planner</a><a href="/car-rentals">Flights &amp; cars</a><a href="/activities">Activities</a><a href="/deals">Beach deals</a><a href="/snowbird">Snowbird stays</a></div>
    <div><strong>Destin Guides</strong><a href="/blog">All guides</a><a href="/blog/destinweather">Weather</a><a href="/blog/best-beaches-destin">Beaches</a><a href="/blog/best-restaurants-destin">Restaurants</a><a href="/blog/destin-events-2026">Events</a></div>
    <div><strong>Guest Information</strong><a href="/guest-guide">Policies</a><a href="/guest-guide#faq">FAQ</a><a href="/beach-cam">Live beach cam</a><a href="/aboutus-574000712">Contact</a><a href="/privacy-574035022">Privacy</a></div>
    <style jsx>{`
      .dcg-tool-footer{position:relative;z-index:4;width:100%;padding:50px clamp(20px,6vw,96px);display:grid;grid-template-columns:1.5fr repeat(4,1fr);gap:36px;background:#04283d;color:#c8d9df;font:12px/1.5 Arial,sans-serif}
      .dcg-tool-footer strong{display:block;margin-bottom:12px;color:#fffefb;font:700 17px Georgia,serif}
      .dcg-tool-footer a{display:block;margin:8px 0;color:#c8d9df;text-decoration:none}
      .dcg-tool-footer a:hover{color:#fff}
      .dcg-tool-footer p{max-width:300px;line-height:1.6}
      .dcg-tool-footer address{margin-top:12px;color:#c8d9df;font-style:normal;line-height:1.6}
      @media(max-width:900px){.dcg-tool-footer{grid-template-columns:1fr 1fr}}
      @media(max-width:560px){.dcg-tool-footer{grid-template-columns:1fr;padding:42px 22px}}
    `}</style>
  </footer>;
}
