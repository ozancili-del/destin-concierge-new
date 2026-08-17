import Script from "next/script";
import { useRouter } from "next/router";
import "../public/dcg-core.js";

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
    </>
  );
}
