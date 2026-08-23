import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import styles from "../styles/Blog.module.css";

const liveSite = "https://www.destincondogetaways.com";
const migratedSlugs = new Set(["destinspa", "how-to-find-cheaper-flights-and-car-rentals", "destincar", "destinsupermarkets", "destin-florida-vacation-guide-2026", "best-time-to-visit-destin-florida", "best-restaurants-destin-local-guide", "best-restaurants-destin", "best-beaches-destin", "destinweather", "destin-fireworks-2026", "destin-events-2026", "destin-live-music-2026", "destinairport", "destindiversehistory", "destinocen", "destinromance", "destinnights", "destinessentials", "destinkids", "destinexplore"]);
const articleDestinations = {
  "destin-condo-ai-concierge-direct-booking": "/why-book-direct",
  "destin-vacation-rental-ai-concierge": "/destin-ai-concierge",
};
const articleHref = (slug) => articleDestinations[slug] || `/blog/${slug}`;

const articles = [
  ["destinweather","Destin Water Temperature Right Now","Live Gulf readings, monthly temperatures and practical swimming guidance.","Weather & Beach","/hub-weather.webp","Live tools"],
  ["destin-fireworks-2026","Destin Fireworks 2026","Schedules, viewing locations, directions and the interactive July 4 map.","Events & Music","/hub-fireworks.webp","Updated guide"],
  ["best-beaches-destin","13 Best Beaches in Destin","Parking, crowd levels, clear-water spots and live beach conditions.","Weather & Beach","/hub-beaches.webp","Local guide"],
  ["best-restaurants-destin","Best Seafood Restaurants in Destin","Waterfront favorites, honest local picks and an interactive restaurant map.","Food & Drink","/hub-seafood.webp","Interactive map"],
  ["destin-events-2026","Destin Events Calendar 2026","Festivals, seasonal events and major happenings around the Emerald Coast.","Events & Music","/hub-events.webp","Updated monthly"],
  ["how-to-find-cheaper-flights-and-car-rentals","Cheaper Flights and Car Rentals","Compare airports, bags, routes and the real cost of reaching Destin.","Getting Here","/hub-flights-cars.webp","Planning guide"],
  ["destin-florida-vacation-guide-2026","Destin Vacation Guide 2026","A broad planning guide covering beaches, airports, food and useful trip tools.","Start Here","/hub-hero.webp","Complete guide"],
  ["destinspa","10 Best Spas in Destin","Wellness and relaxation options ranked with real guest-review context.","Things to Do","/hub-spa.webp","Local guide"],
  ["destinairport","Closest Airports to Destin","VPS, ECP and PNS routes, drive times, live flights and airport maps.","Getting Here","/hub-airports.webp","Live tools"],
  ["destincar","Do You Need a Car in Destin?","Walkability, rideshares, rentals, parking and when a car actually helps.","Getting Here","/car-rental-coastal-drive.webp","Honest guide"],
  ["best-restaurants-destin-local-guide","Italian, Sushi & Breakfast in Destin","Hidden gems, local favorites and the interactive dining map.","Food & Drink","/hub-eats.webp","Interactive map"],
  ["best-time-to-visit-destin-florida","Best Time to Visit Destin","Month-by-month water, weather, crowds, prices and the trip-month quiz.","Plan Your Stay","/hub-weather.webp","Interactive quiz"],
  ["destin-live-music-2026","Live Music in Destin 2026","Concerts, free performances, venues and an interactive music calendar.","Events & Music","/hub-music.webp","Live calendar"],
  ["destinsupermarkets","Grocery Stores Near Pelican Beach","Drive times, store choices and an interactive local grocery map.","Practical Guides","/hub-groceries.webp","Interactive map"],
  ["destin-condo-ai-concierge-direct-booking","Direct Booking Guide","How owner-direct booking works and where marketplace costs differ.","Book Direct","/hub-deals.webp","Booking guide"],
  ["destin-vacation-rental-ai-concierge","The Story of Destiny Blue","Why human-in-the-loop AI supports guests before and during their stay.","About Us","/hub-planner.webp","Our story"],
  ["destindiversehistory","Destin History & Military Heritage","Fishing-village roots, regional history, museums and nearby military heritage.","Things to Do","/florida-panhandle-travel-map.webp","Expanded guide"],
  ["destinocen","Water Activities in Destin","Gulf safety, snorkeling, boating, fishing and activity planning.","Things to Do","/hub-activities.webp","Expanded guide"],
  ["destinromance","Romantic Things to Do in Destin","Sunsets, date nights, spas and balanced couples itineraries.","Things to Do","/hub-beaches.webp","Expanded guide"],
  ["destinnights","Bars & Nightlife in Destin","Evening districts, live music, transport and date-night options.","Food & Drink","/hub-music.webp","Expanded guide"],
  ["destinessentials","Destin Visitor Essentials","A practical arrival, packing, safety, grocery and transport checklist.","Practical Guides","/hub-groceries.webp","Expanded guide"],
  ["destinkids","Destin with Kids","Age-specific activities, beach advice and rainy-day backups.","Things to Do","/hub-activities.webp","Expanded guide"],
  ["destinexplore","Explore Destin","Three-, five- and seven-day itineraries with flexible day trips.","Things to Do","/florida-panhandle-travel-map.webp","Expanded guide"]
].map(([slug,title,description,category,image,badge])=>({slug,title,description,category,image,badge}));

const featured = articles.slice(0,5);
const groups = ["Start Here","Weather & Beach","Food & Drink","Events & Music","Getting Here","Things to Do","Plan Your Stay","Practical Guides","Book Direct","About Us"];

export default function BlogHub(){
  const itemList = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Blog","@id":liveSite+"/blog#blog",name:"Destin Condo Getaways Blog",url:liveSite+"/blog",description:"Local Destin guides covering beaches, weather, restaurants, events, transportation and vacation planning.",blogPost:articles.map((article)=>({"@type":"BlogPosting",headline:article.title,url:liveSite+articleHref(article.slug)}))},
      {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:liveSite},{"@type":"ListItem",position:2,name:"Destin Blog",item:liveSite+"/blog"}]},
      {"@type":"ItemList",numberOfItems:articles.length,itemListElement:articles.map((article,index)=>({"@type":"ListItem",position:index+1,url:liveSite+articleHref(article.slug),name:article.title}))}
    ]
  };

  return <div className={styles.page}>
    <Head>
      <title>Destin Vacation Blog | Local Guides & Trip Planning</title>
      <meta name="description" content="Plan a Destin vacation with local guides to beaches, Gulf weather, restaurants, events, fireworks, airports, activities and Pelican Beach Resort." />
      <meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/blog`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(itemList)}} />
    </Head>

    {process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== "production" ? <div className={styles.preview}>Preview page | The current live website remains unchanged</div> : null}
    <div className={styles.utility}><a href="/destin-condo-rental-reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href="/about">Contact</a></div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.hero}>
        <Image src="/og-hub.webp" alt="Destin beach and emerald Gulf water" fill priority sizes="100vw" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}><p className={styles.kickerLight}>Destin vacation guides</p><h1>Local knowledge for a better beach trip.</h1><p>Weather, beaches, food, events and practical planning—from someone who hosts guests here and keeps the useful tools close.</p></div>
      </section>

      <AvailabilitySearch />

      <section className={styles.featured}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Start with these</p><h2>The guides guests use most.</h2><p>Our highest-value planning articles, including live conditions, maps and frequently updated local information.</p></div>
        <div className={styles.featuredGrid}>{featured.map((article,index)=><a className={index===0?styles.featureLead:styles.featureCard} href={articleHref(article.slug)} key={article.slug}>
          <div className={styles.cardImage}><Image src={article.image} alt="" fill sizes={index===0?"(max-width: 900px) 100vw, 50vw":"(max-width: 900px) 100vw, 25vw"} /></div>
          <div><span>{article.category}</span><h3>{article.title}</h3><p>{article.description}</p><strong>Read the guide →</strong></div>
        </a>)}</div>
      </section>

      <section className={styles.library}>
        <div className={styles.sectionHead}><p className={styles.kicker}>Browse every guide</p><h2>Plan the whole Destin stay.</h2><p>All {articles.length} current articles remain available while each one is carefully reconciled for the new website.</p></div>
        <div className={styles.groupNav}>{groups.map(group=><a href={"#"+group.toLowerCase().replace(/[^a-z0-9]+/g,"-")} key={group}>{group}</a>)}</div>
        {groups.map(group=>{
          const list=articles.filter(article=>article.category===group);
          if(!list.length)return null;
          return <section className={styles.group} id={group.toLowerCase().replace(/[^a-z0-9]+/g,"-")} key={group}><div className={styles.groupTitle}><h3>{group}</h3><span>{list.length} {list.length===1?"guide":"guides"}</span></div><div className={styles.articleGrid}>{list.map(article=><a className={styles.articleCard} href={articleHref(article.slug)} key={article.slug}><div className={styles.thumb}><Image src={article.image} alt="" fill sizes="(max-width: 720px) 100vw, 33vw" /></div><div><span>{article.badge}</span><h4>{article.title}</h4><p>{article.description}</p><strong>Read guide →</strong></div></a>)}</div></section>
        })}
      </section>

      <section className={styles.note}><div><p className={styles.kicker}>Built to stay useful</p><h2>Live tools remain part of the guides.</h2></div><p>The existing weather widgets, restaurant and grocery maps, airport trackers, fireworks map, music calendar and trip-planning tools are being preserved and tested individually—not replaced with screenshots.</p></section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Found your dates?</p><h2>Check live availability.</h2></div><SiteButton href="#availability" variant="primary" size="large">Check availability</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}

// OwnerRez exposed category query variants that Google crawled as duplicate
// blog hubs. Retire only that known CMS parameter and keep the clean hub URL.
export async function getServerSideProps({ query }) {
  if (query.categoryId) {
    return { redirect: { destination: "/blog", permanent: true } };
  }
  return { props: {} };
}
