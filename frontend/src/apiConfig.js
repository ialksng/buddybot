// Central API and base URL configuration
export const BASE_PATH = (import.meta.env.BASE_URL || "/work/projects/buddybot/app").replace(/\/$/, "");
export const API_URL = import.meta.env.VITE_API_URL || BASE_PATH;

// Google OAuth must initiate directly on the origin domain so the browser
// directly receives the 302 redirect to accounts.google.com instead of
// a reverse proxy fetching Google's HTML into the subpath.
export const GOOGLE_AUTH_URL =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000/api/auth/google"
    : (import.meta.env.VITE_GOOGLE_AUTH_URL || "https://buddybot-cyan.vercel.app/api/auth/google");
