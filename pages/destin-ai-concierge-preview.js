import Head from "next/head";
import Concierge from "./concierge";

export default function DestinAiConciergePreview() {
  return <>
    <Head>
      <title>Destiny Blue Native Chat Preview</title>
      <meta name="robots" content="noindex,nofollow" />
    </Head>
    <Concierge previewMode />
  </>;
}
