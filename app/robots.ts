import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // /tabs is a signed-in ledger and /api is JSON; neither belongs in search.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/tabs"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
