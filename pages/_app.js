import Script from "next/script";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
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
