import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import "../public/dcg-core.js";
import "../styles/globals.css";

const CHAT_EXCLUDED_ROUTES = ["/concierge", "/destin-ai-concierge", "/ozan", "/app", "/guestview", "/tv"];

function shouldLoadChat(pathname) {
  return !CHAT_EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const pathname = router.asPath?.split("?")[0]?.split("#")[0] || router.pathname || "/";
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-48.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/favicon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <Component {...pageProps} />
      {shouldLoadChat(pathname) ? <Script src="/destiny-head.js" strategy="lazyOnload" /> : null}
    </>
  );
}
