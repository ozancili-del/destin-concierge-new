import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destin-florida-vacation-guide-2026.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destin-florida-vacation-guide-2026`;

export default function DestinVacationGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Destin Florida Vacation Guide 2026", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };

  return <MigratedBlogArticle canonical={canonical}
    pageTitle="Destin Florida Vacation Guide 2026 | Plan Your Trip"
    description={article.description}
    structuredData={structuredData}
    stylesheet="/disco.css"
    heroImage="/destin-aerial.webp"
    heroAlt="Aerial view of the beach and emerald Gulf water in Destin Florida"
    kicker="Start planning"
    title="Destin Florida Vacation Guide 2026"
    intro="A practical starting point for beaches, weather, airports, food, activities and the details that shape a better Destin trip."
    articleHtml={article.html}
    related={[
      { label: "Weather & water", title: "Destin conditions guide", href: "/blog/destinweather" },
      { label: "Beaches", title: "Best beaches in Destin", href: "/blog/best-beaches-destin" },
      { label: "Dining", title: "Best restaurants in Destin", href: "/blog/best-restaurants-destin" },
      { label: "Events", title: "Current Destin events", href: "/blog/destin-events-2026" },
    ]}
  />;
}
