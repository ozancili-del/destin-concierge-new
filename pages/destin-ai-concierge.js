import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import availabilityStyles from "../styles/Blog.module.css";
import styles from "../styles/DestinAiConcierge.module.css";

const liveSite = "https://www.destincondogetaways.com";
const faqs = [
  ["What can Destiny Blue help with?", "Destiny Blue can check live condo availability, create direct booking links, compare the condos, answer resort and guest questions, research Destin weather, beach conditions, restaurants, activities, concerts and events, and help organize a vacation itinerary."],
  ["Is Destiny Blue a person?", "No. Destiny Blue is an AI concierge created for Destin Condo Getaways. When a request needs the owner, the conversation can be handed to Ozan."],
  ["Can Destiny Blue complete my reservation?", "Destiny Blue can check availability and prepare the correct secure OwnerRez booking link. You review the complete price, guest count, policies and reservation details before completing checkout on the secure booking page."],
  ["Can I ask for Ozan?", "Yes. Ask Destiny Blue to invite Ozan when personal owner assistance is appropriate. His participation depends on availability, while urgent guest and maintenance concerns can still be escalated."],
];

export default function DestinAiConciergePage() {
  const router = useRouter();
  const chatParams = new URLSearchParams({ embed: "1", pageSource: "ai-concierge" });
  if (router.query.bid) chatParams.set("bid", String(router.query.bid));
  if (router.query.sig) chatParams.set("sig", String(router.query.sig));
  if (router.query.fname) chatParams.set("fname", String(router.query.fname));
  const chatSrc = `/concierge?${chatParams.toString()}`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${liveSite}/destin-ai-concierge#webpage`, url: `${liveSite}/destin-ai-concierge`, name: "Destin AI Concierge — Destiny Blue", description: "Chat with Destiny Blue for live Pelican Beach Resort condo availability, direct booking links and personalized Destin vacation planning.", isPartOf: { "@id": `${liveSite}/#website` }, about: { "@id": `${liveSite}/#business` } },
    { "@type": "SoftwareApplication", "@id": `${liveSite}/destin-ai-concierge#application`, name: "Destiny Blue AI Concierge", applicationCategory: "TravelApplication", operatingSystem: "Web", url: `${liveSite}/destin-ai-concierge`, isAccessibleForFree: true, author: { "@id": `${liveSite}/#business` }, description: "AI concierge for Destin Condo Getaways that checks live availability and assists with Destin vacation planning and guest questions." },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Destin AI Concierge", item: `${liveSite}/destin-ai-concierge` }] },
    { "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ] };
  return <div className={styles.page}>
    <Head><title>Destin AI Concierge | Destiny Blue</title><meta name="description" content="Chat with Destiny Blue for live Pelican Beach Resort condo availability, direct booking links, local Destin information and personalized vacation planning." /><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="canonical" href={`${liveSite}/destin-ai-concierge`} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></Head>
    <div className={styles.preview}>Preview page | Production and OwnerRez remain unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href={`${liveSite}/aboutus-574000712`}>Contact</a></div>
    <header className={styles.header}><a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage"><span className={styles.mark}>DCG</span><span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span></a><nav aria-label="Main navigation"><a href="/destin-vacation-rentals-by-owner">Condos</a><a href="/resort">The Resort</a><a href="/blog">Destin Guide</a><a href="/beach-cam">Beach Cam</a><a href="/why-book-direct">Why Book Direct</a></nav><SiteButton href="#availability" variant="primary" size="compact">Live availability</SiteButton></header>
    <main>
      <section className={styles.hero}><div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Destin vacation help, in one conversation</p><h1>Plan your Destin stay with an AI concierge.</h1><p>Ask Destiny Blue about live condo availability, the resort, weather, beach conditions, restaurants, activities, events or an upcoming stay. She is an AI assistant—and Ozan can join when personal owner help is needed.</p><div className={styles.trust}><span>Live availability</span><span>Local trip planning</span><span>Human handoff</span></div></div><div className={styles.portrait}><Image src="/destiny_avatar.png" alt="Destiny Blue, the AI concierge for Destin Condo Getaways" fill priority sizes="(max-width: 900px) 100vw, 44vw" /></div></section>
      <AvailabilitySearch id="availability" className={availabilityStyles.availability} />
      <section className={styles.chatSection} id="chat"><div className={styles.chatIntro}><p className={styles.kicker}>Live chat</p><h2>What can I help you plan?</h2><p>Write naturally. Include dates and the number of adults, children and infants when asking about a stay.</p><div className={styles.capabilities}><span>Check my dates</span><span>Compare the condos</span><span>Plan with kids</span><span>Find activities</span><span>Check conditions</span><span>Existing guest help</span></div><div className={styles.aiNote}><strong>AI, with a real owner behind it.</strong><p>Destiny handles routine research and booking preparation. She does not invent concessions or make promises for Ozan.</p></div></div><div className={styles.chatFrame}><iframe key={chatSrc} src={chatSrc} title="Chat with Destiny Blue, the Destin AI Concierge" allow="clipboard-write" /></div></section>
      <section className={styles.whatSheDoes}><div className={styles.sectionHead}><p className={styles.kicker}>Useful before and during the stay</p><h2>More than a question-and-answer box.</h2></div><div className={styles.featureGrid}>{[["Stay", "Check live dates, compare the exact condos and prepare a secure booking link."],["Plan", "Build an itinerary around your group, interests, weather and pace."],["Explore", "Research restaurants, activities, concerts, events, flights and local transportation."],["Support", "Answer resort and guest questions, recognize urgent situations and involve Ozan when appropriate."]].map(([title, copy]) => <article key={title}><span>{title}</span><p>{copy}</p></article>)}</div></section>
      <section className={styles.faq}><div className={styles.sectionHead}><p className={styles.kicker}>Frequently asked questions</p><h2>How Destiny Blue works.</h2></div><div className={styles.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      <section className={styles.finalCta}><div><p>Prefer to start with the condos?</p><h2>See the exact homes, then ask Destiny anything.</h2></div><SiteButton href="/destin-vacation-rentals-by-owner" variant="primary" size="large">Compare the condos</SiteButton></section>
    </main><SiteFooter />
  </div>;
}
