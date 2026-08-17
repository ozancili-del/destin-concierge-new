import MigratedBlogArticle from "../../components/MigratedBlogArticle";
import article from "../../data/blog/best-restaurants-destin.json";

const liveSite = "https://www.destincondogetaways.com";
const canonical = `${liveSite}/blog/best-restaurants-destin`;
const faq = { "@type": "FAQPage", mainEntity: [
  ["What is the best seafood restaurant in Destin for first-time visitors?", "The Back Porch is the guide's first-time visitor pick: beachfront, casual, walk-in friendly, and known for its amberjack sandwich."],
  ["What is the highest rated restaurant in Destin?", "The guide highlights Commelfo in Miramar Beach for its strong guest ratings, European-style menu and cocktails."],
  ["What is the most romantic restaurant in Destin?", "Beach Walk Cafe at Henderson Park Inn is the guide's romantic pick, with Louisiana Lagniappe as another upscale Gulf-front option."],
  ["What seafood should I order in Destin?", "Ask about the day's local catch. Popular Gulf choices include grouper, red snapper, amberjack, triggerfish and Royal Red shrimp."],
  ["Which Destin seafood restaurants need reservations?", "Beach Walk Cafe, Seagar's and Louisiana Lagniappe commonly need reservations in peak season; many casual harbor restaurants are walk-in only."],
  ["Is there good non-seafood food in Destin?", "Yes. Destin also has Italian, sushi, American and Mediterranean choices covered in the companion local restaurant guide."],
].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) };

export default function DestinSeafoodGuide() {
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": canonical + "#webpage", name: article.h1, description: article.description, url: canonical },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
      { "@type": "ListItem", position: 2, name: "Destin Blog", item: liveSite + "/blog" },
      { "@type": "ListItem", position: 3, name: "Best Seafood Restaurants in Destin", item: canonical },
    ] },
    { "@type": "Article", headline: article.h1, description: article.description, mainEntityOfPage: canonical, author: { "@type": "Person", name: "Ozan CILI" }, publisher: { "@type": "Organization", name: "Destin Condo Getaways", url: liveSite } },
    ...(article.extraSchemas || []), faq,
    { "@type": "LodgingBusiness", "@id": liveSite + "/#business", name: "Destin Condo Getaways", url: liveSite, telephone: "+1-972-357-4262", email: "ozan@destincondogetaways.com", address: { "@type": "PostalAddress", streetAddress: "1002 US-98", addressLocality: "Destin", addressRegion: "FL", postalCode: "32541", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 30.3935, longitude: -86.4958 } },
  ] };
  return <MigratedBlogArticle canonical={canonical} pageTitle="Best Seafood Restaurants in Destin Florida | 2026 Guide" description={article.description} structuredData={structuredData} heroImage="/hub-seafood.webp" heroAlt="Fresh seafood dining in Destin Florida" kicker="Seafood and waterfront dining" title="Best Seafood Restaurants in Destin" intro="Honest local picks for casual beachfront seafood, harbor favorites and fine dining—with distances and an interactive map." articleHtml={article.html} related={[
    { label: "More restaurants", title: "Italian, sushi, breakfast and hidden gems", href: "/blog/best-restaurants-destin-local-guide" },
    { label: "Family", title: "Destin with kids", href: "/blog/destinkids" },
    { label: "Nightlife", title: "Destin after dark", href: "/blog/destinnights" },
    { label: "Planning", title: "Complete Destin vacation guide", href: "/blog/destin-florida-vacation-guide-2026" },
  ]} />;
}
