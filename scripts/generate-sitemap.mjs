// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://daily-dominator-tool.lovable.app";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/support", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/reset-password", changefreq: "yearly", priority: "0.1" },
];

function generateSitemap(items) {
  const urls = items.map((entry) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${entry.path}</loc>`,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);