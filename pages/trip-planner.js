import Head from "next/head";
import Script from "next/script";
import { useEffect, useState } from "react";
import SiteButton from "../components/SiteButton";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/TripPlanner.module.css";

const liveSite = "https://www.destincondogetaways.com";

const faqs = [
  ["Is the Destin itinerary planner free?", "Yes. Build and preview a personalized itinerary at no charge, then email the complete plan to yourself."],
  ["How long does it take?", "Most plans take about 20 to 45 seconds because Destiny Blue researches current events and local options for your dates."],
  ["Can I customize the plan for children?", "Yes. Enter the number of adults and children, then choose the pace, dining preferences and interests that fit your group."],
  ["Will the itinerary be emailed to me?", "Yes. After reviewing the preview, enter your email address and the complete day-by-day itinerary will be sent to you."],
  ["Does it include rainy-day ideas?", "Yes. The planner includes backup suggestions so a change in beach weather does not have to derail the day."],
  ["What areas does the planner cover?", "It focuses on Destin and nearby Emerald Coast options, including Miramar Beach, Fort Walton Beach and other useful nearby stops when they fit your trip."],
];

export default function TripPlannerPage() {
  const [plannerHeight, setPlannerHeight] = useState(1160);

  useEffect(() => {
    const receiveHeight = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== "destin-planner-height") return;
      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight)) setPlannerHeight(Math.max(850, Math.min(nextHeight + 8, 9000)));
    };
    window.addEventListener("message", receiveHeight);
    return () => window.removeEventListener("message", receiveHeight);
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": liveSite + "/destin-vacation-itinerary-planner#webpage", url: liveSite + "/destin-vacation-itinerary-planner", name: "Free Destin Vacation Itinerary Planner", description: "Create a personalized day-by-day Destin itinerary with dining, activities, beaches, local tips and rainy-day backups.", isPartOf: { "@id": liveSite + "/#website" }, about: { "@id": liveSite + "/#business" } },
      { "@type": "WebApplication", "@id": liveSite + "/destin-vacation-itinerary-planner#app", name: "Destin Vacation Itinerary Planner", url: liveSite + "/destin-vacation-itinerary-planner", applicationCategory: "TravelApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: 0, priceCurrency: "USD" }, provider: { "@id": liveSite + "/#business" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
        { "@type": "ListItem", position: 2, name: "Trip Planner", item: liveSite + "/destin-vacation-itinerary-planner" }
      ] },
      { "@type": "FAQPage", mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) }
    ]
  };

  return <div className={styles.page}>
    <Head>
      <title>Free Destin Vacation Itinerary Planner | Destiny Blue</title>
      <meta name="description" content="Build a free personalized Destin vacation itinerary with real restaurants, activities, beaches, local tips and rainy-day backups for your exact travel dates." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={liveSite + "/destin-vacation-itinerary-planner"} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </Head>

    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | Production remains unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader />

    <main>
      <section className={styles.hero}>
        <img src="/images/site/44060a8a29ca4a998586d849184d288f-large.webp" alt="Emerald Gulf water and Pelican Beach Resort in Destin, Florida" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kickerLight}>Free personalized planning tool</p><h1>Your Destin vacation, planned day by day.</h1><p>Choose your dates, group and interests. Destiny Blue creates a tailored itinerary with real dining, activities, local tips and weather-friendly backups.</p><a className={styles.heroLink} href="#build-your-trip">Build my itinerary</a></div>
      </section>

      <section className={styles.intro}>
        <div><p className={styles.kicker}>Built locally for Destin</p><h2>Less tab-hopping. More vacation.</h2></div>
        <div><p>Planning a Destin trip can mean comparing restaurant lists, activity pages, event calendars and weather ideas one by one. This free planner brings those decisions together in a single personalized plan.</p><p>Tell it what your group enjoys and how busy you want each day to feel. You will receive a practical schedule—not a generic list—including dining, beaches, family activities and backup ideas for rainy weather.</p></div>
      </section>

      <section className={styles.plannerSection} id="build-your-trip">
        <div className={styles.sectionHead}><p className={styles.kicker}>Create your plan</p><h2>Tell Destiny Blue about your stay.</h2><p>Your generated itinerary can be previewed here and emailed to you when it looks right.</p></div>
        <div className={styles.plannerShell}>
          <iframe title="Destin vacation itinerary planner" src="/destin-itinerary-planner.html?embedded=1" style={{ height: plannerHeight }} />
        </div>
        <p className={styles.privacyNote}>Your email is used to deliver the itinerary and support your Destin planning. It is not displayed publicly.</p>
      </section>

      <section className={styles.steps}>
        <div className={styles.sectionHead}><p className={styles.kicker}>How it works</p><h2>From preferences to a complete trip.</h2></div>
        <div className={styles.stepGrid}>{[
          ["01", "Add your dates", "Enter arrival and departure so the plan fits the actual length of your stay."],
          ["02", "Describe your group", "Add adults and children, then select food, pace and activity preferences."],
          ["03", "Let Destiny Blue research", "The planner builds a day-by-day schedule and checks relevant local options."],
          ["04", "Preview and email it", "Review the complete plan, start over if needed or send it to your inbox."],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={styles.local}><div><p className={styles.kickerLight}>A better Destin base camp</p><h2>Plan around the beach—not a commute to it.</h2><p>Pelican Beach Resort places you directly on the Gulf with pools, a central Destin location and easy access to restaurants, HarborWalk Village, family attractions and water activities.</p><div className={styles.actions}><SiteButton href="/pelican-beach-resort-destin" variant="primary" size="large">Explore the resort</SiteButton><SiteButton href="/#availability" variant="light" size="large">Check availability</SiteButton></div></div><img src="/images/site/b004f9895bc24136805cc94e514f4039-large.webp" alt="Pelican Beach Resort beside the Gulf of Mexico in Destin" /></section>

      <section className={styles.how}><div className={styles.sectionHead}><p className={styles.kicker}>What the planner considers</p><h2>A useful itinerary starts with the travelers, not a generic list.</h2><p>The form combines your actual stay dates with group size, preferred pace, dining interests and the experiences you care about. That creates a practical sequence instead of placing every popular Destin attraction into every trip.</p></div><div className={styles.steps}>{[
        ["Dates and group", "Arrival and departure determine how many complete days are available. Adults and children help shape pacing, meal choices and age-appropriate ideas."],
        ["Beach, pool and interests", "Choose whether the Gulf, pool time, water activities, fishing, shopping, nature, nightlife, history or wellness should receive more space."],
        ["Food and pace", "Cuisine preferences and a relaxed, balanced or packed pace keep the plan from feeling like someone else's vacation."],
        ["Conditions and backups", "Weather-sensitive activities can be placed where they have room to move, with indoor or flexible alternatives available when conditions change."],
      ].map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className={styles.local}><div><p className={styles.kickerLight}>Use the itinerary intelligently</p><h2>Keep the plan structured, but leave Destin room to change it.</h2><p>Put the highest-priority weather-dependent activity early enough in the stay to allow a second chance. Confirm live operator details, age rules, cancellation terms and current availability before paying for an activity. For restaurants, check current hours and reservation policies rather than relying on an old list.</p><p>A family itinerary usually benefits from one anchor activity and one flexible block per day. Couples may prefer fewer scheduled stops and more room for the beach, sunsets or dining. Longer stays do not need seven consecutive tour days; the planner can balance active days with slower resort time.</p><p>The itinerary is a planning aid, not a reservation. Use its links to check current details, then return to the plan as the shared outline for the trip.</p><div className={styles.actions}><SiteButton href="/blog/destinweather" variant="primary" size="large">Check Destin conditions</SiteButton><SiteButton href="/destin-activities" variant="light" size="large">Browse activities</SiteButton></div></div><img src="/images/site/5cd8d28c33e14711a68e723ec300ca2a-large.webp" alt="Destin beach and Gulf water used for vacation itinerary planning" /></section>

      <section className={styles.how}><div className={styles.sectionHead}><p className={styles.kicker}>Sample planning frameworks</p><h2>Different trips need different rhythms.</h2></div><div className={styles.steps}>{[
        ["A three-night escape", "Protect the arrival evening, choose one high-priority Gulf or harbor experience, and leave a second block flexible for beach conditions. A short trip becomes frustrating when every hour is scheduled."],
        ["Five nights with children", "Alternate active outings with resort time. Keep meals and drive time realistic, include an indoor backup, and avoid placing two long excursions on consecutive days."],
        ["A couples getaway", "Use reservations only where they add value. Leave room for a Gulf morning, sunset, spa time or a longer dinner rather than treating the itinerary as a checklist."],
        ["A seven-night stay", "Spread weather-dependent activities across the week, include groceries and a slower reset day, and consider one nearby-area day only when it fits the group's priorities."],
      ].map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className={styles.how}><div className={styles.sectionHead}><p className={styles.kicker}>What to verify after generation</p><h2>The plan becomes useful when its live details are checked.</h2><p>Review the itinerary as a sequence first. Then open the links for any reservation-dependent item and confirm the details that can change.</p></div><div className={styles.steps}>{[
        ["Activities", "Check the operator's current time, age or weight rules, meeting point, weather policy, cancellation terms, price and availability."],
        ["Dining", "Confirm opening hours, reservation needs, parking and whether the menu still fits dietary or child-related needs."],
        ["Events", "Verify the exact date, venue and start time on an official listing before leaving. Seasonal schedules and performers can change."],
        ["Travel days", "Use live traffic and airline information. Keep checkout, airport travel, rental-car return and security time separate from vacation activities."],
      ].map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className={styles.how}><div className={styles.sectionHead}><p className={styles.kicker}>Arrival and departure days</p><h2>Do not plan them like full vacation days.</h2><p>Arrival time depends on travel, traffic and the 4:00 PM check-in. Use the first evening for groceries, an easy meal, the resort and a flexible sunset rather than a prepaid activity with a narrow start time. On departure day, protect the 10:00 AM checkout, airport travel, rental-car return and security time. If your flight schedule leaves extra hours, choose an option that does not depend on luggage remaining in the condo.</p></div></section>

      <section className={styles.faq} id="faq"><div className={styles.sectionHead}><p className={styles.kicker}>Trip planner FAQ</p><h2>Before you build your itinerary.</h2></div><div className={styles.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

      <section className={styles.related}><div><p className={styles.kicker}>Keep planning</p><h2>Useful Destin guides for your stay.</h2></div><div className={styles.relatedGrid}><a href="/blog/destinweather"><span>Weather</span><strong>Conditions, seasons and water temperature</strong></a><a href="/blog/best-restaurants-destin"><span>Dining</span><strong>Destin restaurants worth planning around</strong></a><a href="/blog/destin-events-2026"><span>Events</span><strong>Current local events and seasonal highlights</strong></a><a href="/blog/destinkids"><span>Families</span><strong>Kid-friendly ways to enjoy Destin</strong></a><a href="/destin-activities"><span>Activities</span><strong>Browse tours and water activities</strong></a><a href="/beach-cam"><span>Beach cam</span><strong>See the Gulf before you arrive</strong></a></div></section>
    </main>

    <SiteFooter />
    <Script src="/destiny-head.js" strategy="lazyOnload" />
  </div>;
}
