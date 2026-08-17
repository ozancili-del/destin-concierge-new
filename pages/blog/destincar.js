import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destincar.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destincar`;

export default function DestinCarGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Do You Need a Car in Destin?", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };

  return <MigratedBlogArticle canonical={canonical}
    pageTitle="Do You Need a Car in Destin Florida? | 2026 Guide"
    description={article.description}
    structuredData={structuredData}
    heroImage="/car-rental-coastal-drive.png"
    heroAlt="Rental car on a coastal drive near Destin Florida"
    kicker="Getting around Destin"
    title="Do You Need a Car in Destin?"
    intro="A practical local guide to airports, rental cars, ride services, parking and getting around the Emerald Coast."
    articleHtml={article.html}
    related={[
      { label: "Flights & cars", title: "Compare the real trip cost", href: "/blog/how-to-find-cheaper-flights-and-car-rentals" },
      { label: "Airports", title: "VPS, PNS and ECP compared", href: liveSite + "/blog/destinairport" },
      { label: "Trip planning", title: "Destin vacation guide", href: liveSite + "/blog/destin-florida-vacation-guide-2026" },
      { label: "Where to stay", title: "Pelican Beach Resort guide", href: "/resort" },
    ]}
  />;
}
