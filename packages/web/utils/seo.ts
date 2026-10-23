const APP_URL = import.meta.env.VITE_APP_URL || "https://splithub.space";

export const SITE_TITLE = "SplitHub | Tap to pay, straight from your wallet";
export const SITE_DESCRIPTION =
  "Tap-to-pay with an NFC chip that authorizes payments from your own wallet. Stores, venues, and splits with friends on Base, with no balance parked on the card.";

/** Head meta for a page: title plus Open Graph and Twitter cards. */
export function seo({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  image = "/thumbnail.png",
}: { title?: string; description?: string; image?: string } = {}) {
  const imageUrl = `${APP_URL}${image}`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: APP_URL },
    { property: "og:site_name", content: "SplitHub" },
    { property: "og:locale", content: "en_US" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ];
}
