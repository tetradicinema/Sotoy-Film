import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache handler helper for XML sitemaps and dynamic SEO content
  const handleCacheAndHeaders = (res: express.Response, req: express.Request, latestDateMs: number) => {
    const lastModDate = new Date(latestDateMs);
    const lastModStr = lastModDate.toUTCString();
    const etag = `W/"sitemap-${latestDateMs}"`;

    // Directives to enforce validation but allow standard edge caching
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.setHeader("Last-Modified", lastModStr);
    res.setHeader("ETag", etag);

    if (
      req.headers["if-none-match"] === etag ||
      req.headers["if-modified-since"] === lastModStr
    ) {
      res.status(304).end();
      return true;
    }
    return false;
  };

  // 1. API ROUTES FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. FIRESTORE-POWERED SITEMAP XML GENERATOR WITH CACHING
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (!fs.existsSync(firebaseConfigPath)) {
        throw new Error("firebase-applet-config.json configuration not found.");
      }

      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      
      // Initialize isolated background app for sitemap generation
      const sitemapApp = initializeApp(firebaseConfig, "sitemap-app");
      const sitemapDb = getFirestore(sitemapApp, firebaseConfig.firestoreDatabaseId);

      const staticUrls = [
        { loc: "https://www.sotoyfilm.my.id/", priority: "1.0", changefreq: "daily", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/film-database", priority: "0.9", changefreq: "daily", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/film-recommendations", priority: "0.8", changefreq: "weekly", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/community-feed", priority: "0.8", changefreq: "daily", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/about-us", priority: "0.5", changefreq: "monthly", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/privacy-policy", priority: "0.5", changefreq: "monthly", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/terms-conditions", priority: "0.5", changefreq: "monthly", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/business-inquiries", priority: "0.5", changefreq: "monthly", lastmod: "2026-09-17" },
        { loc: "https://www.sotoyfilm.my.id/critic-criteria", priority: "0.5", changefreq: "monthly", lastmod: "2026-09-17" },
      ];

      // Add category hubs
      const categories = ["movies", "series", "anime", "cinema-gear", "film-studies"];
      categories.forEach(cat => {
        staticUrls.push({
          loc: `https://www.sotoyfilm.my.id/kategori/${cat}`,
          priority: "0.7",
          changefreq: "weekly",
          lastmod: "2026-09-17"
        });
      });

      let articlesList: any[] = [];
      let filmsList: any[] = [];
      let latestDateMs = new Date("2026-09-17").getTime();

      // Query Published Articles from Firestore
      try {
        const articlesCol = collection(sitemapDb, "articles");
        const articlesQuery = query(articlesCol, where("status", "==", "published"));
        const articlesSnapshot = await getDocs(articlesQuery);
        
        articlesSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const pubDate = data.publishedAt || new Date().toISOString();
          const pubTime = new Date(pubDate).getTime();
          if (pubTime > latestDateMs) {
            latestDateMs = pubTime;
          }
          
          articlesList.push({
            loc: `https://www.sotoyfilm.my.id/artikel/${data.slug || docSnap.id}`,
            lastmod: pubDate.split("T")[0],
            changefreq: "weekly",
            priority: "0.8"
          });
        });
      } catch (err) {
        console.error("Sitemap generator: Failed to fetch articles", err);
      }

      // Query Films Catalog from Firestore
      try {
        const filmsCol = collection(sitemapDb, "films");
        const filmsSnapshot = await getDocs(filmsCol);
        
        const slugifyLocal = (str: string) => {
          return (str || '')
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        };

        filmsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Use movie release year as approximate last modified fallback, or current build time
          const lastmod = data.year ? `${data.year}-01-01` : "2026-09-17";
          const filmTime = new Date(lastmod).getTime();
          if (filmTime > latestDateMs) {
            latestDateMs = filmTime;
          }

          const filmSlug = data.slug || (data.title ? slugifyLocal(data.title) : docSnap.id);

          filmsList.push({
            loc: `https://www.sotoyfilm.my.id/film/${filmSlug}`,
            lastmod,
            changefreq: "monthly",
            priority: "0.9"
          });
        });
      } catch (err) {
        console.error("Sitemap generator: Failed to fetch films", err);
      }

      // Combine urls
      const allUrls = [...staticUrls, ...articlesList, ...filmsList];

      // Handle conditional ETag caching
      if (handleCacheAndHeaders(res, req, latestDateMs)) {
        return;
      }

      // Output fresh XML if no matches
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;
      
      allUrls.forEach(url => {
        xml += `  <url>\n`;
        xml += `    <loc>${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += `  </url>\n`;
      });
      xml += `</urlset>`;

      res.status(200).send(xml);
    } catch (error) {
      console.error("Failed to generate sitemap:", error);
      res.status(500).send("Internal Server Error generating Sitemap.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);
  });
}

startServer().catch(err => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});
