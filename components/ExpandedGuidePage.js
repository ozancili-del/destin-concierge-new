import MigratedBlogArticle from "./MigratedBlogArticle";
import guideStyles from "../styles/ExpandedGuide.module.css";
import { guides } from "../data/expanded-guides";

const liveSite = "https://www.destincondogetaways.com";

function renderText(text, key) {
  return <p key={key} dangerouslySetInnerHTML={{__html:text}} />;
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
    {"@type":"LodgingBusiness","@id":`${liveSite}/#business`,name:"Destin Condo Getaways",url:liveSite,telephone:"+1-972-357-4262",email:"ozan@destincondogetaways.com",address:{"@type":"PostalAddress",streetAddress:"1002 US-98",addressLocality:"Destin",addressRegion:"FL",postalCode:"32541",addressCountry:"US"},geo:{"@type":"GeoCoordinates",latitude:30.3935,longitude:-86.4958}}
  ]};
  const body = <div className={guideStyles.guide}>
    <p className={guideStyles.byline}>By Ozan CILI, owner of Destin Condo Getaways · Published and updated August 16, 2026</p>
    <p className={guideStyles.lede}>{guide.lede}</p>
    <nav className={guideStyles.jump} aria-label="On this page"><strong>Plan faster</strong><div>{guide.sections.map(s=><a href={`#${s.id}`} key={s.id}>{s.heading}</a>)}<a href="#frequently-asked-questions">FAQ</a></div></nav>
    <section id="quick-guide"><h2>{guide.listName}</h2><div className={guideStyles.cards}>{guide.cards.map(card=><div className={guideStyles.card} key={card.title}><h3>{card.title}</h3><p dangerouslySetInnerHTML={{__html:card.text}} /></div>)}</div></section>
    {guide.sections.map(section=><section id={section.id} key={section.id}><h2>{section.heading}</h2>{section.paragraphs.map((p,i)=>renderText(p,`${section.id}-${i}`))}{section.points?<ul>{section.points.map(x=><li key={x} dangerouslySetInnerHTML={{__html:x}} />)}</ul>:null}{section.callout?<div className={guideStyles.callout} dangerouslySetInnerHTML={{__html:section.callout}} />:null}</section>)}
    <section id="frequently-asked-questions" className={guideStyles.faq}><h2>Frequently asked questions</h2>{guide.faqs.map(f=><details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>
    <p className={guideStyles.updated}>Local businesses, schedules, prices and conditions can change. Verify time-sensitive details with the linked official source before leaving.</p>
  </div>;
  return <MigratedBlogArticle pageTitle={guide.pageTitle} description={guide.description} canonical={canonical} structuredData={structuredData} heroImage={guide.image} heroAlt={guide.alt} kicker={guide.kicker} title={guide.title} intro={guide.intro} articleContent={body} related={guide.related} />;
}
