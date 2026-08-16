import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import SiteButton from "../components/SiteButton";
import AvailabilitySearch from "../components/AvailabilitySearch";
import styles from "../styles/Blog.module.css";

const liveSite = "https://www.destincondogetaways.com";
const migratedSlugs = new Set(["destinspa", "how-to-find-cheaper-flights-and-car-rentals", "destincar", "destinsupermarkets", "destin-florida-vacation-guide-2026", "best-time-to-visit-destin-florida", "best-restaurants-destin-local-guide", "best-restaurants-destin", "best-beaches-destin", "destinairport"]);
const articleHref = (slug) => migratedSlugs.has(slug) ? `/blog/${slug}` : `${liveSite}/blog/${slug}`;

const articles = [
  ["destinweather","Destin Water Temperature Right Now","Live Gulf readings, monthly temperatures and practical swimming guidance.","Weather & Beach","/hub-weather.png","Live tools"],
  ["destin-fireworks-2026","Destin Fireworks 2026","Schedules, viewing locations, directions and the interactive July 4 map.","Events & Music","/hub-fireworks.png","Updated guide"],
  ["best-beaches-destin","13 Best Beaches in Destin","Parking, crowd levels, clear-water spots and live beach conditions.","Weather & Beach","/hub-beaches.png","Local guide"],
  ["best-restaurants-destin","Best Seafood Restaurants in Destin","Waterfront favorites, honest local picks and an interactive restaurant map.","Food & Drink","/hub-seafood.png","Interactive map"],
  ["destin-events-2026","Destin Events Calendar 2026","Festivals, seasonal events and major happenings around the Emerald Coast.","Events & Music","/hub-events.png","Updated monthly"],
  ["how-to-find-cheaper-flights-and-car-rentals","Cheaper Flights and Car Rentals","Compare airports, bags, routes and the real cost of reaching Destin.","Getting Here","/hub-flights-cars.png","Planning guide"],
  ["destin-florida-vacation-guide-2026","Destin Vacation Guide 2026","A broad planning guide covering beaches, airports, food and useful trip tools.","Start Here","/hub-hero.png","Complete guide"],
  ["destinspa","10 Best Spas in Destin","Wellness and relaxation options ranked with real guest-review context.","Things to Do","/hub-spa.png","Local guide"],
  ["destinairport","Closest Airports to Destin","VPS, ECP and PNS routes, drive times, live flights and airport maps.","Getting Here","/hub-airports.png","Live tools"],
  ["destincar","Do You Need a Car in Destin?","Walkability, rideshares, rentals, parking and when a car actually helps.","Getting Here","/car-rental-coastal-drive.png","Honest guide"],
  ["best-restaurants-destin-local-guide","Italian, Sushi & Breakfast in Destin","Hidden gems, local favorites and the interactive dining map.","Food & Drink","/hub-eats.png","Interactive map"],
  ["best-time-to-visit-destin-florida","Best Time to Visit Destin","Month-by-month water, weather, crowds, prices and the trip-month quiz.","Plan Your Stay","/hub-weather.png","Interactive quiz"],
  ["destin-live-music-2026","Live Music in Destin 2026","Concerts, free performances, venues and an interactive music calendar.","Events & Music","/hub-music.png","Live calendar"],
  ["destinsupermarkets","Grocery Stores Near Pelican Beach","Drive times, store choices and an interactive local grocery map.","Practical Guides","/hub-groceries.png","Interactive map"],
  ["destin-condo-ai-concierge-direct-booking","Direct Booking Guide","How owner-direct booking works and where marketplace costs differ.","Book Direct","/hub-deals.png","Booking guide"],
  ["destin-vacation-rental-ai-concierge","The Story of Destiny Blue","Why human-in-the-loop AI supports guests before and during their stay.","About Us","/hub-planner.png","Our story"],
  ["destindiversehistory","Destin History & Military Heritage","Fishing-village roots, coastal history and nearby military landmarks.","Things to Do","/florida-panhandle-travel-map.png","Needs refresh"],
  ["destinocen","Water Activities in Destin","Snorkeling, parasailing, boating and ways to enjoy the Gulf.","Things to Do","/hub-activities.png","Needs refresh"],
  ["destinromance","Romantic Things to Do in Destin","Sunsets, dinners and memorable experiences for couples.","Things to Do","/hub-beaches.png","Needs refresh"],
  ["destinnights","Bars & Nightlife in Destin","Beachfront bars, evening venues and live-music options.","Food & Drink","/hub-music.png","Needs refresh"],
  ["destinessentials","Destin Visitor Essentials","Groceries, pharmacies, practical services and pre-arrival planning.","Practical Guides","/hub-groceries.png","Needs refresh"],
  ["destinkids","Destin with Kids","Family-friendly beaches, activities and rainy-day ideas.","Things to Do","/hub-activities.png","Needs refresh"],
  ["destinexplore","Explore Destin","Fishing, Crab Island, dolphin tours and Emerald Coast day trips.","Things to Do","/hub-activities.png","Needs refresh"]
].map(([slug,title,description,category,image,badge])=>({slug,title,description,category,image,badge}));

const featured = articles.slice(0,5);
const groups = ["Start Here","Weather & Beach","Food & Drink","Events & Music","Getting Here","Things to Do","Plan Your Stay","Practical Guides","Book Direct","About Us"];

export default function BlogHub(){
  const itemList = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Blog","@id":liveSite+"/blog#blog",name:"Destin Condo Getaways Blog",url:liveSite+"/blog",description:"Local Destin guides covering beaches, weather, restaurants, events, transportation and vacation planning.",blogPost:articles.map((article)=>({"@type":"BlogPosting",headline:article.title,url:liveSite+"/blog/"+article.slug}))},
      {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:liveSite},{"@type":"ListItem",position:2,name:"Destin Blog",item:liveSite+"/blog"}]},
      {"@type":"ItemList",numberOfItems:articles.length,itemListElement:articles.map((article,index)=>({"@type":"ListItem",position:index+1,url:liveSite+"/blog/"+article.slug,name:article.title}))}
    ]
  };

  return <div className={styles.page}>
    <Head>
      <title>Destin Vacation Blog | Local Guides & Trip Planning</title>
      <meta name="description" content="Plan a Destin vacation with local guides to beaches, Gulf weather, restaurants, events, fireworks, airports, activities and Pelican Beach Resort." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(itemList)}} />
    </Head>

    <div className={styles.preview}>Preview page | Production and OwnerRez remain unchanged</div>
    <div className={styles.utility}><a href="/reviews">Guest Reviews</a><a href="/guest-guide#faq">FAQ</a><a href="/guest-guide#policies">Policies</a><a href={liveSite+"/aboutus-574000712"}>Contact</a></div>
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Destin Condo Getaways homepage"><span className={styles.mark}>DCG</span><span><strong>Destin Condo Getaways</strong><small>Pelican Beach Resort | Destin, Florida</small></span></a>
      <nav aria-label="Main navigation"><a href="/#condos">Condos</a><a href="/resort">The Resort</a><a href="/blog" aria-current="page">Destin Guide</a><a href={liveSite+"/destin-live-beach-cam-574002656"}>Beach Cam</a><a href="https://deals.destincondogetaways.com/beach-deals">Deals</a><a href="/guest-guide#faq">FAQ</a></nav>
      <SiteButton href="#availability" variant="primary" size="compact">Check availability</SiteButton>
    </header>

    <main>
      <section className={styles.hero}>
        <Image src="/og-hub.jpg" alt="Destin beach and emerald Gulf water" fill priority sizes="100vw" />
        <div className={styles.heroShade}></div>
        <div className={styles.heroCopy}><p className={styles.kickerLight}>Destin vacation guides</p><h1>Local knowledge for a better beach trip.</h1><p>Weather, beaches, food, events and practical planning—from someone who hosts guests here and keeps the useful tools close.</p></div>
      </section>

      <AvailabilitySearch className={styles.availability} />

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

    <footer className={styles.footer}><div className={styles.footerBrand}><strong>Destin Condo Getaways</strong><p>Thoughtful owner-direct hospitality at Pelican Beach Resort.</p><a href="tel:+19723574262">(972) 357-4262</a><a href="mailto:ozan@destincondogetaways.com">ozan@destincondogetaways.com</a><address>1002 US-98<br/>Destin, FL 32541</address></div><div><strong>Stay</strong><a href={liveSite+"/pelican-beach-resort-unit-707-orp5b47b5ax"}>Unit 707</a><a href={liveSite+"/pelican-beach-resort-unit-1006-orp5b6450ex"}>Unit 1006</a><a href="#availability">Availability</a><a href="/reviews">Reviews</a><a href="/why-book-direct">Book direct</a></div><div><strong>Plan</strong><a href={liveSite+"/blog/how-to-find-cheaper-flights-and-car-rentals"}>Flights</a><a href={liveSite+"/blog/destincar"}>Car rentals</a><a href="https://explore.destincondogetaways.com/destin-tripshock.html">Activities</a><a href={liveSite+"/destin-vacation-itinerary-planner-574049367"}>Itinerary planner</a><a href={liveSite+"/map"}>Destin map</a></div><div><strong>Destin Guides</strong><a href={liveSite+"/blog/destinweather"}>Weather</a><a href={liveSite+"/blog/best-beaches-destin"}>Beaches</a><a href={liveSite+"/blog/best-restaurants-destin"}>Restaurants</a><a href={liveSite+"/blog/destin-events-2026"}>Events</a><a href={liveSite+"/blog/destin-fireworks-2026"}>Fireworks</a></div><div><strong>Guest Information</strong><a href="/guest-guide#policies">Policies</a><a href="/guest-guide#faq">FAQ</a><a href={liveSite+"/aboutus-574000712"}>Contact</a><a href={liveSite+"/privacy-574035022"}>Privacy</a><a href={liveSite+"/destin-live-beach-cam-574002656"}>Live beach cam</a></div></footer>
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
