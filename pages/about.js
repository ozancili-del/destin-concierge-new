import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import AvailabilitySearch from "../components/AvailabilitySearch";
import SiteButton from "../components/SiteButton";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import styles from "../styles/AboutLegal.module.css";

const liveSite = "https://www.destincondogetaways.com";

export default function About() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${liveSite}/about#webpage`,
        url: `${liveSite}/about`,
        name: "About Ozan and Destin Condo Getaways",
        isPartOf: { "@id": `${liveSite}/#website` },
        about: { "@id": `${liveSite}/#business` },
      },
      {
        "@type": "LodgingBusiness",
        "@id": `${liveSite}/#business`,
        name: "Destin Condo Getaways",
        url: liveSite,
        telephone: "+1-972-357-4262",
        email: "ozan@destincondogetaways.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "1002 US-98",
          addressLocality: "Destin",
          addressRegion: "FL",
          postalCode: "32541",
          addressCountry: "US",
        },
        founder: {
          "@type": "Person",
          name: "Ozan Cili",
          sameAs: [
            "https://www.linkedin.com/in/ozancili/",
            "https://www.facebook.com/Ozancili/",
          ],
        },
        sameAs: [
          "https://www.facebook.com/DestinCondoGetaways",
          "https://airbnb.com/h/destindream",
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: liveSite },
          { "@type": "ListItem", position: 2, name: "About", item: `${liveSite}/about` },
        ],
      },
    ],
  };

  return <div className={styles.page}>
    <Head>
      <title>About Ozan | Destin Condo Getaways</title>
      <meta name="description" content="Meet Ozan Cili, the owner behind Destin Condo Getaways, and learn why personal support, transparent direct booking and guest trust guide every stay." />
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={`${liveSite}/about`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </Head>

    <div className={styles.preview}>Migration preview | The current live website remains unchanged</div>
    <SiteHeader availabilityHref="#availability" />

    <main>
      <section className={styles.aboutHero}>
        <div className={styles.portrait}>
          <Image src="https://uc.orez.io/f/9617d4a8e90b442fa5ef0332ac346eb4" alt="Ozan Cili, owner of Destin Condo Getaways" fill priority sizes="(max-width: 760px) 100vw, 42vw" />
        </div>
        <div className={styles.heroCopy}><a href="/">Home</a><p className={styles.kicker}>Meet your host</p><h1>Hospitality built around trust.</h1><p>Destin Condo Getaways is personally owned and managed by Ozan Cili—a world traveler, technology executive, father and hands-on host who believes direct booking should still feel personal.</p></div>
      </section>

      <AvailabilitySearch className={styles.availability} />

      <section className={styles.story}>
        <div><p className={styles.kicker}>How it started</p><h2>From a family getaway to owner-direct hospitality.</h2></div>
        <div>
          <p>After living and working across Asia-Pacific, the Middle East, Africa, the CIS, Europe and the United States, my family discovered Destin after moving to the U.S. in 2016. We purchased our first vacation-rental condo in 2020 and added another in December 2023.</p>
          <p>Our first visit confirmed what the Gulf photos could not fully explain: white sand, emerald water, balcony views and the sound of the waves without the noise of a city. Destin quickly became one of our favorite places to recharge.</p>
          <p>The website began because returning guests repeatedly asked whether they could reserve directly. We continue to welcome guests through established marketplaces, but this site offers another path: see the exact condo, check live information, complete secure online checkout and communicate directly with the owner.</p>
        </div>
      </section>

      <section className={styles.trust}>
        <div><p className={styles.kickerLight}>Why trust matters</p><h2>Trust is demonstrated, not declared.</h2><p>It is reasonable to verify an independent vacation-rental website before booking. You can review our public hosting history, contact me directly, and complete payment through the secure booking flow rather than relying only on a promise.</p></div>
        <div className={styles.proofGrid}>
          <a href="https://airbnb.com/h/destindream" target="_blank" rel="noopener noreferrer"><span>Hosting history</span><strong>View our Airbnb profile</strong></a>
          <a href="/reviews"><span>Guest experiences</span><strong>Read verified reviews</strong></a>
          <a href="https://www.linkedin.com/in/ozancili/" target="_blank" rel="noopener noreferrer"><span>Professional identity</span><strong>Connect on LinkedIn</strong></a>
          <a href="https://www.facebook.com/Ozancili/" target="_blank" rel="noopener noreferrer"><span>Personal contact</span><strong>Message Ozan on Facebook</strong></a>
        </div>
      </section>

      <section className={styles.story}>
        <div><p className={styles.kicker}>What owner-managed means here</p><h2>One accountable host from planning through the stay.</h2></div>
        <div>
          <p>Owner-managed hospitality is not simply a lower-fee checkout path. It means the person responsible for the listing also understands the exact condo, the resort and the questions guests tend to have before arrival. The photographs, sleeping arrangements, policies and live booking information are presented for the specific home being reserved.</p>
          <p>Before booking, guests can compare the condo pages, read past experiences and review the complete total and reservation terms through secure checkout. After booking, arrival and stay information is provided through the guest process connected to the reservation. Destiny Blue can answer routine planning questions, while maintenance, safety or personal owner matters can be brought to me.</p>
          <p>Direct communication does not mean informal payment or unclear terms. The reservation is completed through the secure online flow, and guests should rely on the written price, dates, occupancy, cancellation policy and rental terms shown there before confirming.</p>
        </div>
      </section>

      <section className={styles.contact}>
        <div><p className={styles.kicker}>Contact Ozan</p><h2>A real person is behind every stay.</h2><p>Questions about the condos, booking process or an upcoming visit are welcome. For reservation-specific or urgent in-stay instructions, use the contact details supplied with your booking.</p></div>
        <div className={styles.contactCard}><a href="tel:+19723574262"><span>Call or text</span><strong>(972) 357-4262</strong></a><a href="mailto:ozan@destincondogetaways.com"><span>Email</span><strong>ozan@destincondogetaways.com</strong></a><address><span>Pelican Beach Resort</span><strong>1002 US-98<br />Destin, FL 32541</strong></address></div>
      </section>

      <section className={styles.story}><div><p className={styles.kicker}>Before you reserve</p><h2>Verify the home, the host and the checkout.</h2></div><div><p>Start with the exact condo page and its current photographs. Enter the real dates and every traveler, then review the complete total rather than comparing only a nightly headline. The secure checkout should identify the unit, dates, occupancy, fees, taxes, cancellation terms and payment schedule before you submit a reservation.</p><p>If anything is unclear, ask before paying. I would rather answer a direct question about fit, policies or the resort than have a guest make an assumption that affects the stay. That same principle guides the local guides and Destiny Blue: be useful, distinguish live information from general guidance and involve a person when the situation needs one.</p></div></section>

      <section className={styles.finalCta}><div><p className={styles.kickerLight}>Ready to plan?</p><h2>Find the stay that fits your dates.</h2></div><SiteButton href="#availability" variant="primary" size="large">Live availability</SiteButton></section>
    </main>

    <SiteFooter />
    <Script src="/destiny-loader.js" strategy="lazyOnload" />
  </div>;
}
