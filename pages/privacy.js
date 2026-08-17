import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/AboutLegal.module.css";

const liveSite = "https://www.destincondogetaways.com";

const sections = [
  ["Information we collect", "We may receive information you provide through availability searches, booking and inquiry forms, email subscriptions, itinerary tools, live chat, owner-support requests and direct communications. This may include your name, email address, telephone number, travel dates, guest count, reservation details and the content of your message."],
  ["Booking and payment information", "Reservations and payments are processed through the secure booking services presented during checkout. Destin Condo Getaways may receive the reservation and guest details needed to manage the stay, but payment-card handling is performed by the applicable payment and booking providers under their own privacy and security practices."],
  ["Automatically collected information", "When you use the website, standard technical data may be collected, such as IP address, browser and device type, referring page, pages visited, approximate location, dates and times, and interactions with site features. We use this information to operate, secure and improve the website."],
  ["How we use information", "We use information to answer inquiries, check availability, prepare requested travel information, manage reservations and guest support, operate live chat, send communications you request, prevent abuse, understand website performance, comply with legal obligations and protect guests, the business and others."],
  ["Cookies and similar technologies", "The website and its service providers may use cookies, local storage, pixels and similar technologies for essential operation, preferences, analytics, security and measurement. You can limit cookies through your browser settings, although some booking, chat or personalization features may not function correctly."],
  ["Service providers and disclosures", "We may share information with service providers that support booking, payment processing, website hosting, analytics, communications, email delivery, guest support and security, but only as reasonably necessary for those services. We may also disclose information when required by law, to respond to valid legal process, or to protect rights, safety and property. We do not sell personal information for money."],
  ["Email and marketing choices", "If you request updates or provide an email address for an offer or planning tool, we may send the requested information and limited related communications. You may unsubscribe using the link in a marketing email. Reservation, transactional and safety communications may still be sent when necessary."],
  ["Data retention and security", "We retain information for as long as reasonably necessary for reservations, guest support, legal, accounting, fraud-prevention and operational purposes. We use reasonable administrative and technical safeguards, but no internet transmission or storage system can be guaranteed completely secure."],
  ["Your choices and requests", "You may ask to access, correct or delete personal information that we control, subject to reservation records, legal obligations and legitimate business needs. You may also opt out of marketing communications. Privacy rights vary by location, and we will respond as required by applicable law."],
  ["Children's privacy", "The website is intended for adults arranging travel. We do not knowingly seek personal information directly from children. Adults making a reservation are responsible for supplying only the information needed for the traveling party."],
  ["External links", "Our pages may link to our secure booking provider, Airbnb, Vrbo, activity operators, travel services, social networks and other third parties. Their privacy policies and practices govern information collected on their websites."],
  ["Live chat and AI-assisted tools", "Messages submitted through Destiny Blue or another website chat feature may be processed to provide an answer, retain the context of the conversation, connect relevant booking or destination information, detect abuse and support a requested owner handoff. Do not submit payment-card numbers, door codes or other highly sensitive information in ordinary chat. When a guest uses a reservation-specific secure link, the information available through that experience may be tied to the applicable booking."],
  ["Itinerary and email tools", "When you ask the trip planner to email an itinerary or provide an email address for a requested discount or guide, the address and submitted preferences may be sent to the email-delivery service used to fulfill that request. An itinerary may include travel dates, group size and interests, but it is not itself a reservation. Marketing consent, where requested, is handled separately from transactional delivery."],
  ["Analytics and advertising measurement", "Analytics and measurement services may help us understand how visitors reached the website, which pages or booking steps they used, and whether an advertisement or referral produced a visit or inquiry. These services may use cookies or similar identifiers. We use aggregated reporting to improve navigation, content and booking flow; individual providers describe their own collection and opt-out methods in their policies."],
  ["Information involved in an owner handoff", "If you ask for Ozan to join a live conversation, the message that prompted the request and the conversation identifier may be sent through the owner-notification service so the correct chat can be located. The owner may then see and respond to messages in that conversation. Requesting a handoff does not authorize a discount, payment change or reservation modification."],
  ["Reservation and guest-access links", "Some links may contain a booking identifier, signature or other token that connects the visitor to reservation-specific information. Treat those links as private, do not post them publicly and use the newest link supplied for the reservation. We may continue to support an older link format for a limited transition period, but signed links and other access controls are preferred where available."],
  ["Do Not Track and browser controls", "Browser privacy controls, cookie blocking and similar preference signals may limit analytics or advertising technologies, but websites and providers do not all interpret every signal in the same way. You can clear stored website data, block third-party cookies or use provider opt-out tools. Essential reservation, security and requested communication functions may still process information needed to operate."],
  ["International access", "The business and primary lodging are in the United States. If you access the website from another country, information may be processed in the United States or in another location where a contracted service provider operates. Applicable rights and transfer requirements depend on the visitor's location and the service involved."],
  ["Policy updates", "We may update this policy when the website, services or legal requirements change. The effective date shown on this page identifies the latest revision. Continued use of the website after an update is subject to the revised policy."],
];

export default function Privacy() {
  const schema = { "@context": "https://schema.org", "@type": "WebPage", "@id": `${liveSite}/privacy#webpage`, url: `${liveSite}/privacy`, name: "Privacy Policy | Destin Condo Getaways", dateModified: "2026-08-16", isPartOf: { "@id": `${liveSite}/#website` } };
  return <div className={styles.page}>
    <Head>
      <title>Privacy Policy | Destin Condo Getaways</title>
      <meta name="description" content="Learn how Destin Condo Getaways collects, uses and protects information related to website visits, inquiries, direct bookings, trip planning and guest support." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/privacy`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </Head>
    <div className={styles.preview}>Migration preview | Production remains unchanged</div>
    <SiteHeader />
    <main>
      <section className={styles.legalHero}><div><a href="/">Home</a><p className={styles.kickerLight}>Privacy policy</p><h1>Your information deserves straightforward treatment.</h1><p>This policy explains what information Destin Condo Getaways may collect, why it is used and the choices available to you.</p><small>Effective August 16, 2026</small></div></section>
      <section className={styles.legalIntro}><p>We collect only the information reasonably needed to operate the website, respond to guests, provide requested planning tools and support reservations. We do not rent personal information or publish private guest communications.</p><p>This policy applies to Destin Condo Getaways websites and web tools. Separate providers used for booking, payment, email, analytics or linked travel services may maintain their own policies.</p></section>
      <section className={styles.legalContent}>
        <aside><strong>Privacy questions</strong><p>Contact Ozan if you have a question or request concerning information controlled by Destin Condo Getaways.</p><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a><a href="tel:+19723574262">(972) 357-4262</a></aside>
        <div>{sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</div>
      </section>
    </main>
    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
