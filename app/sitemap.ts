import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only pages a logged-out crawler can open; "/" redirects them to /login.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/login", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
