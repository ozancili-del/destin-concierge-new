import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import schema707 from "../data/unit-707-schema.json";
import schema1006 from "../data/unit-1006-schema.json";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/GalleryMapFaq.module.css";

const liveSite = "https://www.destincondogetaways.com";
const unitPhotos = [
  ...schema707.image.map((src, index) => ({ src, unit: "707", index, caption: `Pelican Beach Resort Unit 707 — ${index < 15 ? "Gulf-front living area, balcony or beach view" : index < 35 ? "kitchen, bedroom, bunks or bathroom" : "resort pool, beach access or amenity"} — photo ${index + 1}` })),
  ...schema1006.image.map((src, index) => ({ src, unit: "1006", index, caption: `Pelican Beach Resort Unit 1006 — ${index < 13 ? "panoramic Gulf view, balcony or living area" : index < 25 ? "kitchen, bedroom, bunks or bathroom" : "resort pool, beach access or amenity"} — photo ${index + 1}` })),
];

export default function Gallery() {
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState(null);
  const photos = useMemo(() => filter === "all" ? unitPhotos : unitPhotos.filter((photo) => photo.unit === filter), [filter]);
  useEffect(() => {
    if (active === null) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setActive(null); if (event.key === "ArrowRight") setActive((active + 1) % photos.length); if (event.key === "ArrowLeft") setActive((active - 1 + photos.length) % photos.length); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [active, photos.length]);
  const imageSchema = unitPhotos.map((photo) => ({ "@type": "ImageObject", contentUrl: photo.src, caption: photo.caption }));
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", "@id": `${liveSite}/gallery#webpage`, url: `${liveSite}/gallery`, name: "Pelican Beach Resort Condo Photo Gallery", description: "Complete photo gallery for Destin Condo Getaways Units 707 and 1006 at Pelican Beach Resort.", primaryImageOfPage: imageSchema[0], associatedMedia: imageSchema }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: liveSite }, { "@type": "ListItem", position: 2, name: "Gallery", item: `${liveSite}/gallery` }] }] };
  return <div className={styles.page}>
    <Head><title>Pelican Beach Resort Condo Gallery | Destin</title><meta name="description" content="Explore the complete photo galleries for Gulf-front Units 707 and 1006 at Pelican Beach Resort, including rooms, balconies, beach views, pools and amenities."/><meta name="robots" content={process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "production" ? "index,follow" : "noindex,nofollow"}/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="canonical" href={`${liveSite}/gallery`}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}/></Head>
    <div className={styles.preview}>Migration preview | The current live website remains unchanged</div><SiteHeader availabilityHref="#availability" />
    <main><section className={styles.galleryHero}><div><a href="/">Home</a><p className={styles.kickerLight}>Complete photo gallery</p><h1>See the exact condos before you choose.</h1><p>Browse the complete property photo collection—interiors, private balconies, Gulf views, beach access, pools and resort amenities.</p></div></section>
      <AvailabilitySearch />
      <section className={styles.galleryIntro}><div><p className={styles.kicker}>Choose your Gulf view</p><h2>Browse everything or filter by condo.</h2></div><div className={styles.filters} role="group" aria-label="Filter gallery"><button className={filter === "all" ? styles.activeFilter : ""} onClick={() => {setFilter("all");setActive(null);}}>All photos</button><button className={filter === "707" ? styles.activeFilter : ""} onClick={() => {setFilter("707");setActive(null);}}>Unit 707</button><button className={filter === "1006" ? styles.activeFilter : ""} onClick={() => {setFilter("1006");setActive(null);}}>Unit 1006</button></div></section>
      <section className={styles.photoGrid} aria-live="polite">{photos.map((photo, index) => <button type="button" key={`${photo.unit}-${photo.index}`} onClick={() => setActive(index)} aria-label={`Enlarge ${photo.caption}`}><img src={photo.src} alt={photo.caption} width="900" height="650" loading={index < 8 ? "eager" : "lazy"}/><span>Unit {photo.unit}</span></button>)}</section>
      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready to choose?</p><h2>Match the exact home to your dates.</h2></div><div><SiteButton href="/destin-vacation-rentals-by-owner" variant="light">Compare vacation rentals</SiteButton><SiteButton href="/availability" variant="primary">Check live availability</SiteButton></div></section>
    </main><SiteFooter/><Script src="/destiny-loader.js" strategy="lazyOnload"/>
    {active !== null && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Condo photo gallery"><button className={styles.close} onClick={() => setActive(null)} aria-label="Close gallery">×</button><button className={styles.previous} onClick={() => setActive((active - 1 + photos.length) % photos.length)} aria-label="Previous photo">‹</button><figure><img src={photos[active].src} alt={photos[active].caption}/><figcaption>{photos[active].caption}<span>{active + 1} / {photos.length}</span></figcaption></figure><button className={styles.next} onClick={() => setActive((active + 1) % photos.length)} aria-label="Next photo">›</button></div>}
  </div>;
}
