import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destinsupermarkets.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destinsupermarkets`;

export default function DestinSupermarketsGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Grocery Stores Near Pelican Beach Resort", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };

  return <MigratedBlogArticle
    pageTitle="Grocery Stores Near Pelican Beach Resort | Destin Guide"
    description={article.description}
    structuredData={structuredData}
    heroImage="/hub-groceries.png"
    heroAlt="Grocery and vacation essentials near Pelican Beach Resort in Destin"
    kicker="Groceries & essentials"
    title="Grocery Stores Near Pelican Beach Resort"
    intro="Compare nearby supermarkets, specialty markets, seafood shops and delivery options with an interactive local map."
    articleHtml={article.html}
    related={[
      { label: "Visitor essentials", title: "Pharmacies and useful services", href: liveSite + "/blog/destinessentials" },
      { label: "Dining", title: "Best restaurants in Destin", href: liveSite + "/blog/best-restaurants-destin" },
      { label: "Explore", title: "Destin interactive map", href: liveSite + "/map" },
      { label: "Trip planning", title: "Destin vacation guide", href: liveSite + "/blog/destin-florida-vacation-guide-2026" },
    ]}
  />;
}
