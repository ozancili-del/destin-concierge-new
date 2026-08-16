import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/best-time-to-visit-destin-florida.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/best-time-to-visit-destin-florida`;

export default function BestTimeToVisitGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Best Time to Visit Destin Florida", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.faq ? [article.faq] : []),
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };

  return <MigratedBlogArticle
    pageTitle="Best Time to Visit Destin Florida | Month-by-Month Guide"
    description={article.description}
    structuredData={structuredData}
    heroImage="/destin-aerial.jpg"
    heroAlt="Destin Florida beach and emerald Gulf water viewed from above"
    kicker="Choose your month"
    title="Best Time to Visit Destin Florida"
    intro="Compare weather, water temperatures, crowds, events and seasonal tradeoffs—then use the interactive quiz to find your best fit."
    articleHtml={article.html}
    related={[
      { label: "Weather & water", title: "Destin conditions guide", href: liveSite + "/blog/destinweather" },
      { label: "Beaches", title: "Best beaches in Destin", href: liveSite + "/blog/best-beaches-destin" },
      { label: "Events", title: "Destin events calendar", href: liveSite + "/blog/destin-events-2026" },
      { label: "Current reductions", title: "Browse beach deals", href: "/deals" },
    ]}
  />;
}
