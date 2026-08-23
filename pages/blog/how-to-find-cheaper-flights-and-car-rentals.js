import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/how-to-find-cheaper-flights-and-car-rentals.json";

const liveSite = "https://www.destincondogetaways.com";
const slug = "how-to-find-cheaper-flights-and-car-rentals";
const canonical = `${liveSite}/blog/${slug}`;

export default function FlightsAndCarsGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Cheaper Flights and Car Rentals", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };

  return <MigratedBlogArticle canonical={canonical}
    pageTitle="Cheaper Flights and Car Rentals to Destin | Compare the Real Cost"
    description={article.description}
    structuredData={structuredData}
    heroImage="/flights-cars-hero-bg.webp"
    heroAlt="Flight and rental-car planning for a Destin Florida vacation"
    kicker="Flights & car rentals"
    title="Cheaper Flights and Car Rentals to Destin"
    intro="Compare airports, flight routes, rental-car totals and the real cost of reaching the Emerald Coast before you book."
    articleHtml={article.html}
    related={[
      { label: "Airports", title: "VPS, PNS and ECP compared", href: "/blog/destinairport" },
      { label: "Driving", title: "Do you need a rental car?", href: "/blog/destincar" },
      { label: "Trip planning", title: "Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
      { label: "Where to stay", title: "Pelican Beach Resort guide", href: "/pelican-beach-resort-destin" },
    ]}
  />;
}
