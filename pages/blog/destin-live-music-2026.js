import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destin-live-music-2026.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destin-live-music-2026`;

export default function DestinLiveMusicGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Live Music in Destin 2026", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, image: liveSite + "/hub-music.png", mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    ...(article.extraSchemas || []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle pageTitle="Live Music in Destin FL 2026 | Concert & Venue Guide" description={article.description} structuredData={structuredData} heroImage="/hub-music.png" heroAlt="Live music, concerts and waterfront venues around Destin Florida" kicker="Concerts, venues and free performances" title="Live Music in Destin FL 2026" intro="Use the interactive calendar and local venue guide to find concerts, free performances and live music around Destin and the Emerald Coast." articleHtml={article.html} related={[
    { label: "Events", title: "Destin events calendar 2026", href: "/blog/destin-events-2026" },
    { label: "Fireworks", title: "Destin fireworks schedule and map", href: "/blog/destin-fireworks-2026" },
    { label: "Food", title: "Best seafood restaurants in Destin", href: "/blog/best-restaurants-destin" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
  ]} />;
}
