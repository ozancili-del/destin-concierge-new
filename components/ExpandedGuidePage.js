import MigratedBlogArticle from "./MigratedBlogArticle";
import guideStyles from "../styles/ExpandedGuide.module.css";
import { guides } from "../data/expanded-guides";

const liveSite = "https://www.destincondogetaways.com";

// OwnerRez keeps inline declarations in blog HTML but removes embedded
// <style> blocks. Keep these styles inline so the same article remains
// readable when its rendered HTML is migrated into OwnerRez.
const inline = {
  guide: { maxWidth: 820, margin: "0 auto", padding: "40px 18px", color: "#263b48", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.82 },
  byline: { fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.5, fontWeight: 600, color: "#71808a", margin: "0 0 28px" },
  lede: { fontSize: 20, lineHeight: 1.65, color: "#183a4a", margin: "0 0 24px" },
  jump: { background: "#f3f9f9", border: "1px solid #cce3e6", borderRadius: 16, padding: 22, margin: "32px 0" },
  jumpTitle: { display: "block", color: "#073b58", marginBottom: 12 },
  jumpLinks: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 },
  jumpLink: { display: "block", fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.35, fontWeight: 700, color: "#087a8b", background: "#fff", border: "1px solid #b9d7dc", borderRadius: 999, padding: "10px 13px", textAlign: "center", textDecoration: "none" },
  h2: { color: "#073b58", fontSize: 31, lineHeight: 1.2, margin: "50px 0 18px" },
  h3: { color: "#126c7b", fontSize: 22, lineHeight: 1.35, margin: "24px 0 10px" },
  paragraph: { margin: "0 0 19px" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, margin: "22px 0 34px" },
  card: { border: "1px solid #dce5e7", borderRadius: 14, padding: 20, background: "#fff" },
  cardHeading: { color: "#126c7b", fontSize: 20, lineHeight: 1.35, margin: "0 0 9px" },
  list: { paddingLeft: 24, margin: "0 0 25px" },
  callout: { background: "#faf7f0", borderLeft: "5px solid #d9a441", borderRadius: 8, padding: "22px 24px", margin: "32px 0" },
  faq: { borderTop: "1px solid #dce5e7", paddingTop: 10 },
  details: { borderBottom: "1px solid #dce5e7", padding: "17px 0" },
  summary: { cursor: "pointer", color: "#073b58", fontWeight: 700 },
  updated: { fontFamily: "Arial, sans-serif", fontSize: 13, color: "#74818a", marginTop: 40 },
};

function renderText(text, key) {
  return <p key={key} style={inline.paragraph} dangerouslySetInnerHTML={{__html:text}} />;
}

export default function ExpandedGuidePage({ slug }) {
  const guide = guides[slug];
  const canonical = `${liveSite}/blog/${slug}`;
  const structuredData = {"@context":"https://schema.org","@graph":[
    {"@type":"BlogPosting","@id":`${canonical}#article`,headline:guide.title,description:guide.description,image:`${liveSite}${guide.image}`,datePublished:"2026-08-16",dateModified:"2026-08-16",author:{"@type":"Person",name:"Ozan CILI"},publisher:{"@type":"Organization","@id":`${liveSite}/#business`,name:"Destin Condo Getaways",url:liveSite},mainEntityOfPage:{"@id":`${canonical}#webpage`}},
    {"@type":"WebPage","@id":`${canonical}#webpage`,url:canonical,name:guide.title,description:guide.description,isPartOf:{"@id":`${liveSite}/#website`},about:{"@type":"Place",name:"Destin, Florida"}},
    {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:liveSite},{"@type":"ListItem",position:2,name:"Destin Blog",item:`${liveSite}/blog`},{"@type":"ListItem",position:3,name:guide.shortTitle,item:canonical}]},
    {"@type":"FAQPage",mainEntity:guide.faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))},
    {"@type":"ItemList",name:guide.listName,itemListElement:guide.cards.map((card,index)=>({"@type":"ListItem",position:index+1,name:card.title,description:card.text.replace(/<[^>]+>/g,"")}))},
    {"@type":"LodgingBusiness","@id":`${liveSite}/#business`,name:"Destin Condo Getaways",url:liveSite,telephone:"+1-972-357-4262",email:"ozan@destincondogetaways.com",address:{"@type":"PostalAddress",streetAddress:"1002 US-98",addressLocality:"Destin",addressRegion:"FL",postalCode:"32541",addressCountry:"US"},geo:{"@type":"GeoCoordinates",latitude:30.3845507,longitude:-86.4745732}}
  ]};
  const body = <div className={guideStyles.guide} style={inline.guide}>
    <p className={guideStyles.byline} style={inline.byline}>By Ozan CILI, owner of Destin Condo Getaways · Published and updated August 16, 2026</p>
    <p className={guideStyles.lede} style={inline.lede}>{guide.lede}</p>
    <nav className={guideStyles.jump} style={inline.jump} aria-label="On this page"><strong style={inline.jumpTitle}>Plan faster</strong><div style={inline.jumpLinks}>{guide.sections.map(s=><a href={`#${s.id}`} style={inline.jumpLink} key={s.id}>{s.heading}</a>)}<a href="#frequently-asked-questions" style={inline.jumpLink}>FAQ</a></div></nav>
    <section id="quick-guide"><h2 style={inline.h2}>{guide.listName}</h2><div className={guideStyles.cards} style={inline.cards}>{guide.cards.map(card=><div className={guideStyles.card} style={inline.card} key={card.title}><h3 style={inline.cardHeading}>{card.title}</h3><p style={inline.paragraph} dangerouslySetInnerHTML={{__html:card.text}} /></div>)}</div></section>
    {guide.sections.map(section=><section id={section.id} key={section.id}><h2 style={inline.h2}>{section.heading}</h2>{section.paragraphs.map((p,i)=>renderText(p,`${section.id}-${i}`))}{section.points?<ul style={inline.list}>{section.points.map(x=><li key={x} dangerouslySetInnerHTML={{__html:x}} />)}</ul>:null}{section.callout?<div className={guideStyles.callout} style={inline.callout} dangerouslySetInnerHTML={{__html:section.callout}} />:null}</section>)}
    <section id="frequently-asked-questions" className={guideStyles.faq} style={inline.faq}><h2 style={inline.h2}>Frequently asked questions</h2>{guide.faqs.map(f=><details style={inline.details} key={f.q}><summary style={inline.summary}>{f.q}</summary><p style={inline.paragraph}>{f.a}</p></details>)}</section>
    <p className={guideStyles.updated} style={inline.updated}>Local businesses, schedules, prices and conditions can change. Verify time-sensitive details with the linked official source before leaving.</p>
  </div>;
  return <MigratedBlogArticle pageTitle={guide.pageTitle} description={guide.description} canonical={canonical} structuredData={structuredData} heroImage={guide.image} heroAlt={guide.alt} kicker={guide.kicker} title={guide.title} intro={guide.intro} articleContent={body} related={guide.related} />;
}
