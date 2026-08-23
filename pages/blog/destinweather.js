import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/destinweather.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/destinweather`;

export default function DestinWeatherGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Destin Water Temperature", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, image: liveSite + "/beaches-pelican-sand-water.jpg", mainEntityOfPage: canonical, datePublished: "2026-03-10T00:00:00-05:00", dateModified: "2026-04-28T00:00:00-05:00", author: { "@type": "Person", name: "Ozan CILI", url: liveSite }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    ...(article.extraSchemas || []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="Destin Water Temperature Right Now | Monthly Swim Guide" description={article.description} structuredData={structuredData} heroImage="/beaches-pelican-sand-water.jpg" heroAlt="Emerald Gulf water and white sand in Destin Florida" kicker="Live Gulf conditions and monthly guide" title="Destin Water Temperature Right Now" intro="See the live Gulf reading, monthly water temperatures, swimming comfort, tides, beach safety and the best seasonal activities for each temperature range." articleHtml={article.html} related={[
    { label: "Beaches", title: "Best beaches in Destin", href: "/blog/best-beaches-destin" },
    { label: "Timing", title: "Best time to visit Destin", href: "/blog/best-time-to-visit-destin-florida" },
    { label: "Events", title: "Destin events calendar 2026", href: "/blog/destin-events-2026" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
  ]} />;
}
