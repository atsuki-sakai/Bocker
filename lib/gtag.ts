export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: URL) => {
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = (
  name: Gtag.EventNames,
  params: Gtag.EventParams
) => {
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", name, params);
};
