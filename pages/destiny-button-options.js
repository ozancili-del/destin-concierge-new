import Head from "next/head";
import styles from "../styles/DestinyButtonOptions.module.css";

const options = [
  {
    number: "01",
    title: "Simple and direct",
    note: "Fastest to understand",
    button: <><span className={styles.icon} aria-hidden="true">💬</span><span>Ask Destiny</span></>,
  },
  {
    number: "02",
    title: "Branded helper",
    note: "More personality and context",
    button: <><span className={styles.icon} aria-hidden="true">✦</span><span className={styles.stack}><strong>Ask Destiny Blue</strong><small>AI trip &amp; booking help</small></span></>,
  },
  {
    number: "03",
    title: "Guest-focused",
    note: "Explains the purpose first",
    button: <><span className={styles.icon} aria-hidden="true">💬</span><span>Chat about your stay</span></>,
  },
];

export default function DestinyButtonOptions() {
  return (
    <>
      <Head>
        <title>Destiny Chat Button Options</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <header>
          <p>DESIGN TEST · NOT LIVE</p>
          <h1>Choose Destiny&apos;s chat button</h1>
          <span>Three lightweight options. No portrait, animation, or automatic popup.</span>
        </header>

        <section className={styles.grid}>
          {options.map((option) => (
            <article className={styles.card} key={option.number}>
              <div className={styles.copy}>
                <b>{option.number}</b>
                <div><h2>{option.title}</h2><p>{option.note}</p></div>
              </div>
              <div className={styles.mockPage}>
                <div className={styles.lines}><i/><i/><i/></div>
                <button type="button" className={`${styles.chatButton} ${option.number === "02" ? styles.tall : ""}`}>
                  {option.button}
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
