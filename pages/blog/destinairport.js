import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destinairport.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destinairport`;

export default function DestinAirportGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Destin Airport Guide", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.extraSchemas || []), ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="Live Destin Airport Guide | VPS, ECP & PNS" description={article.description} structuredData={structuredData} heroImage="/airport-terminal-sunset.webp" heroAlt="Airport terminal near Destin Florida at sunset" kicker="Arrive with less guesswork" title="Destin Airport Guide" intro="Compare VPS, ECP and PNS, follow the route to Pelican Beach Resort, and check live arrival and departure boards." articleHtml={article.html} related={[
    { label: "Rental cars", title: "Destin car rental guide", href: "/blog/destincar" },
    { label: "Flights", title: "Find cheaper flights and cars", href: "/blog/how-to-find-cheaper-flights-and-car-rentals" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
    { label: "Weather", title: "Destin weather guide", href: liveSite + "/blog/destinweather" },
  ]} />;
}
