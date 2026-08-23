import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/best-beaches-destin.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/best-beaches-destin`;

export default function BestDestinBeachesGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Best Beaches in Destin", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, image: liveSite + "/beaches-pelican-sand-water.jpg", mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="13 Best Beaches in Destin Florida | 2026 Local Guide" description={article.description} structuredData={structuredData} heroImage="/beaches-pelican-sand-water.jpg" heroAlt="Sugar-white sand and emerald Gulf water at Pelican Beach Resort in Destin" kicker="Beach-by-beach local guide" title="Best Beaches in Destin" intro="Compare 13 beaches, live Gulf conditions, parking, crowds and the best fit for families, couples and quieter days." articleHtml={article.html} related={[
    { label: "Weather", title: "Destin weather and water temperatures", href: "/blog/destinweather" },
    { label: "Timing", title: "Best time to visit Destin", href: "/blog/best-time-to-visit-destin-florida" },
    { label: "Family", title: "Destin with kids", href: "/blog/destinkids" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
  ]} />;
}
