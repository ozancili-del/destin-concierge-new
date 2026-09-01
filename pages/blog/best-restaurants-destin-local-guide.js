import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/best-restaurants-destin-local-guide.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/best-restaurants-destin-local-guide`;

export default function DestinRestaurantGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Destin Restaurant Guide", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.extraSchemas || []), ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3845507, longitude: -86.4745732 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="Best Italian, Sushi & Breakfast Restaurants in Destin FL" description={article.description} structuredData={structuredData} heroImage="/hub-eats.webp" heroAlt="Restaurants and dining around Destin Florida" kicker="Eat like a local" title="Destin Restaurant Guide" intro="Italian, sushi, breakfast, family favorites and hidden gems—plus an interactive map with directions from Pelican Beach Resort." articleHtml={article.html} related={[
    { label: "Seafood", title: "Best restaurants in Destin", href: "/blog/best-restaurants-destin" },
    { label: "Family", title: "Destin with kids", href: "/blog/destinkids" },
    { label: "Nightlife", title: "Destin after dark", href: "/blog/destinnights" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
  ]} />;
}
