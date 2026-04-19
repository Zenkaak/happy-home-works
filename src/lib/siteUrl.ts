const FALLBACK_PUBLIC_URL = "https://convo-build-buddy.lovable.app";

export const getAppBaseUrl = () => {
  if (typeof window === "undefined") return FALLBACK_PUBLIC_URL;

  const origin = window.location.origin;
  const isPreview = origin.includes("id-preview--") || origin.includes("localhost");

  return isPreview ? FALLBACK_PUBLIC_URL : origin;
};

export const APP_PUBLIC_URL = FALLBACK_PUBLIC_URL;