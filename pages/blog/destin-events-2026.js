import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destin-events-2026.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destin-events-2026`;

export default function DestinEventsGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Destin Events Calendar 2026", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, image: liveSite + "/hub-events.webp", mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    ...(article.extraSchemas || []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="Destin Events Calendar 2026 | Festivals & Activities" description={article.description} structuredData={structuredData} heroImage="/hub-events.webp" heroAlt="Destin events, festivals and waterfront celebrations" kicker="Updated 2026 events calendar" title="Destin Events Calendar 2026" intro="Plan around festivals, fishing events, food celebrations, concerts and the major seasonal happenings across Destin and the Emerald Coast." articleHtml={article.html} related={[
    { label: "Fireworks", title: "Destin fireworks schedule and map", href: "/blog/destin-fireworks-2026" },
    { label: "Music", title: "Destin live music guide", href: "/blog/destin-live-music-2026" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
    { label: "Weather", title: "Destin weather guide", href: "/blog/destinweather" },
  ]} />;
}
