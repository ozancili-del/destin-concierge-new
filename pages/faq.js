import Head from "next/head";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/GalleryMapFaq.module.css";

const liveSite = "https://www.destincondogetaways.com";
const groups = [
  ["Booking direct", [
    ["Why should I book directly?", "Booking directly connects you with the owner, uses secure checkout and may save up to 20% depending on the marketplace and stay. Compare final totals because dates, fees and promotions vary."],
    ["Where can I see the complete price?", "Use Live Availability, choose the exact condo, dates and guest count, and review the secure checkout total—including rent, fees, taxes and controlling terms—before confirming."],
    ["What are check-in and checkout times?", "Standard check-in is 4:00 PM Central and checkout is 10:00 AM Central unless a different time is specifically confirmed."],
  ]],
  ["The condos", [
    ["How many guests can stay?", "Each condo accommodates no more than six people. Every adult, child and infant counts toward the maximum."],
    ["What is the difference between Units 707 and 1006?", "Both are one-bedroom, two-bath Gulf-front condos. Unit 707 has a seventh-floor perspective; Unit 1006 provides a higher tenth-floor panorama. Their individual furnishings and style also differ."],
    ["Are the condos pet friendly?", "No. Both condos are pet-free and non-smoking. Contact Ozan before booking if you need to discuss a legally required accommodation."],
    ["Is laundry available?", "Shared coin- or card-operated laundry facilities are available on each floor of the main building."],
  ]],
  ["Pelican Beach Resort", [
    ["Is the resort directly beachfront?", "Yes. The main building is directly on the Gulf. Guests take the elevator downstairs and walk onto the beach without crossing a road."],
    ["What pools and amenities are available?", "The resort includes outdoor pools, an indoor/outdoor pool, hot tubs, fitness facilities, tennis, grills, seasonal beach service and other shared amenities. Hours and availability can change."],
    ["Where is the resort?", "Pelican Beach Resort is at 1002 US-98, Destin, Florida 32541, near central-Destin dining and attractions."],
  ]],
  ["Planning and support", [
    ["Can you help plan the rest of our trip?", "Yes. The trip planner and Destin AI concierge can help with weather context, restaurants, activities, transportation and a day-by-day plan."],
    ["What if something needs maintenance?", "Report maintenance, damage or a disturbance promptly using the contact details supplied with the reservation so the appropriate response can be coordinated."],
    ["Where should I verify time-sensitive information?", "Use the linked live or official source for weather, beach conditions, events, activity inventory, transportation and resort operations before leaving."],
  ]],
];
const faqs = groups.flatMap(([, items]) => items);

export default function FAQ() {
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "FAQPage", "@id": `${liveSite}/destin-condo-rental-faq#webpage`, url: `${liveSite}/destin-condo-rental-faq`, name: "Destin Condo Getaways Frequently Asked Questions", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "FAQ", item: `${liveSite}/destin-condo-rental-faq` }] },
  ] };
  return <div className={styles.page}>
    <Head><title>Destin Condo Rental FAQ | Pelican Beach Resort</title><meta name="description" content="Answers about direct booking, Unit 707, Unit 1006, Pelican Beach Resort, occupancy, check-in, amenities, trip planning and guest support."/><meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"}/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="canonical" href={`${liveSite}/destin-condo-rental-faq`}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}/></Head>
    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Migration preview | Production remains unchanged</div> : null}<SiteHeader/>
    <main><section className={styles.faqHero}><div><a href="/">Home</a><p className={styles.kickerLight}>Frequently asked questions</p><h1>Clear answers before your Destin stay.</h1><p>Start with the questions guests ask most, then use the Guest Guide for detailed policies and arrival information.</p></div></section>
      <section className={styles.faqLayout}><aside><p className={styles.kicker}>Jump to</p>{groups.map(([name]) => <a key={name} href={`#${name.toLowerCase().replaceAll(" ", "-")}`}>{name}</a>)}<SiteButton href="/guest-guide" variant="secondary">Open guest guide</SiteButton></aside><div>{groups.map(([name, items]) => <section key={name} id={name.toLowerCase().replaceAll(" ", "-")}><p className={styles.kicker}>{name}</p>{items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>)}</div></section>
      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Still deciding?</p><h2>Ask about your exact dates.</h2></div><div><SiteButton href="/availability" variant="primary">Live availability</SiteButton><SiteButton href="/destin-ai-concierge" variant="light">Open Live Chat</SiteButton></div></section>
    </main><SiteFooter/><Script src="/destiny-loader.js" strategy="lazyOnload"/>
  </div>;
}
