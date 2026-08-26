import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/RestaurantMapEmbedPreview.module.css";

const places = [
  { name: "Pelican Beach Resort", detail: "Resort origin", rating: "4.2", lat: 30.3845948, lng: -86.4745738, image: "/beaches-pelican-beachfront.jpg" },
  { name: "Louisiana Lagniappe", detail: "Seafood & Creole", rating: "4.7", lat: 30.3866517, lng: -86.4842208, image: "/beaches-pelican-balcony.jpg" },
  { name: "Boshamps Seafood & Oyster House", detail: "Harbor seafood", rating: "4.4", lat: 30.3926832, lng: -86.5001961, image: "/hub-eats.webp" },
  { name: "Brotula's Seafood House", detail: "Seafood & steamers", rating: "4.4", lat: 30.3934535, lng: -86.5068817, image: "/hub-seafood.webp" },
];

function loadGoogleMaps(key) {
  if (window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-dcg-google-maps]');
    if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
    const script = document.createElement("script");
    script.dataset.dcgGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function RestaurantMapEmbedPreview() {
  const mapNode = useRef(null); const mapRef = useRef(null);
  const [active, setActive] = useState(0); const [status, setStatus] = useState("Loading map…");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/maps-key").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(({ key }) => loadGoogleMaps(key)).then(() => {
      if (cancelled || !mapNode.current) return;
      const bounds = new window.google.maps.LatLngBounds();
      const map = new window.google.maps.Map(mapNode.current, { center: { lat: 30.389, lng: -86.491 }, zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: "cooperative" });
      mapRef.current = map;
      places.forEach((place, index) => { bounds.extend({ lat: place.lat, lng: place.lng }); const marker = new window.google.maps.Marker({ map, position: { lat: place.lat, lng: place.lng }, title: place.name, label: { text: index === 0 ? "P" : String(index), color: "white", fontWeight: "700" } }); marker.addListener("click", () => setActive(index)); });
      map.fitBounds(bounds, 52); setStatus("");
    }).catch(() => setStatus("The map could not load. Please refresh in a moment."));
    return () => { cancelled = true; };
  }, []);
  function focusPlace(index) { setActive(index); const place = places[index]; mapRef.current?.panTo({ lat: place.lat, lng: place.lng }); mapRef.current?.setZoom(15); }
  return <><Head><title>Restaurant Map Embed Preview | Destin Condo Getaways</title><meta name="robots" content="noindex,nofollow"/><meta name="viewport" content="width=device-width, initial-scale=1"/></Head><main className={styles.page}><article className={styles.article}><p className={styles.eyebrow}>DESIGN TEST · NOT PUBLISHED IN THE BLOG YET</p><h1>Restaurants near Pelican Beach Resort</h1><p className={styles.intro}>A compact, useful map can sit naturally inside a guide—giving readers geographic context without pulling them away from the story.</p><p>Here is the lighter editorial treatment: Pelican Beach Resort as the starting point, a small verified shortlist nearby, and cards readers can tap to explore the map.</p><section className={styles.embed} aria-label="Restaurant map preview"><div ref={mapNode} className={styles.map}/>{status && <div className={styles.status}>{status}</div>}<div className={styles.cards}>{places.map((place,index)=><button key={place.name} className={`${styles.card} ${active===index?styles.active:""}`} onClick={()=>focusPlace(index)}><img src={place.image} alt=""/><span><strong>{place.name}</strong><small><b>★ {place.rating}</b> · {place.detail}</small></span></button>)}</div></section><p className={styles.note}>Preview note: the final article version can use the restaurants selected for that specific guide, with current details checked before publication.</p></article></main></>;
}
