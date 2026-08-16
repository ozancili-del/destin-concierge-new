import Script from "next/script";
import { useRouter } from "next/router";

const CHAT_EXCLUDED_ROUTES = ["/concierge", "/destin-ai-concierge", "/ozan", "/app", "/guestview", "/tv"];

function shouldLoadChat(pathname) {
  return !CHAT_EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const pathname = router.asPath?.split("?")[0]?.split("#")[0] || router.pathname || "/";
  return (
    <>
      <Component {...pageProps} />
      {shouldLoadChat(pathname) ? <Script src="/destiny-head.js" strategy="lazyOnload" /> : null}
      <Script
        id="destin-gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (window.location.hostname === "www.destincondogetaways.com" || window.location.hostname === "destincondogetaways.com") {
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
              var firstScript = document.getElementsByTagName("script")[0];
              var gtmScript = document.createElement("script");
              gtmScript.async = true;
              gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=GTM-PQSF8S6D";
              firstScript.parentNode.insertBefore(gtmScript, firstScript);
            }
          `,
        }}
      />
    </>
  );
}
