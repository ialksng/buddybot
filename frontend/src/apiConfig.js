// Central API and base URL configuration
export const BASE_PATH = (import.meta.env.BASE_URL || "/work/projects/buddybot/app").replace(/\/$/, "");
export const API_URL = import.meta.env.VITE_API_URL || BASE_PATH;
