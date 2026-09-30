import express from "express";
import path from "path";
import fs from "fs";
import { handleTmdbRequest } from "./api/tmdb";
import { handleImageProxy } from "./api/image-proxy";
import { isBotUserAgent } from "./src/lib/edge/botDetection";
import { injectMetaTags, FALLBACK_HTML_TEMPLATE } from "./src/lib/edge/metaInjection";
import { buildRouteMetadata } from "./src/utils/seoMetadata";
import { fetchEntityData } from "./src/lib/edge/firestoreRest";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. API ROUTES FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // TMDB Proxy route for catalog import (mirrors Vercel api/tmdb.ts)
  app.get("/api/tmdb", (req, res) => {
    return handleTmdbRequest(req, res);
  });

  // Image Proxy route for canvas rendering without CORS tainting (mirrors Vercel api/image-proxy.ts)
  app.get("/api/image-proxy", (req, res) => {
    return handleImageProxy(req, res);
  });

  // Note: /sitemap.xml is statically generated at build-time into public/sitemap.xml
  // and served directly by express.static(distPath) in production or Vite in development.

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

    app.get("*all", async (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      const userAgent = (req.headers["user-agent"] as string) || "";

      // Dynamic pre-rendered meta tags injection for search bots and social crawlers
      if (isBotUserAgent(userAgent)) {
        try {
          const pathname = req.path;
          let baseHtml = FALLBACK_HTML_TEMPLATE;
          if (fs.existsSync(indexPath)) {
            baseHtml = fs.readFileSync(indexPath, "utf-8");
          }

          let title = "";
          let description = "";
          let image = "";
          let type = "website";
          let publishedTime: string | undefined;
          let videoDirector: string | undefined;
          let videoReleaseDate: string | undefined;
          let videoTags: string[] | undefined;
          let videoActors: string[] | undefined;

          // Check if it's a dynamic entity route
          if (pathname.startsWith("/film/")) {
            const slug = decodeURIComponent(pathname.replace(/^\/film\/?/, "")).replace(/\/$/, "");
            const data = await fetchEntityData("films", slug);
            if (data) {
              title = `${data.title || "Film"}${data.year ? ` (${data.year})` : ""} — Skor Sotoy & Review Film`;
              description = data.synopsis || data.curatorNote || `Lihat ulasan sinema, rating Skor Sotoy, dan tempat nonton film ${data.title}.`;
              image = data.backdrop || data.poster || "";
              type = "video.movie";
              videoDirector = data.director;
              videoReleaseDate = data.year ? `${data.year}-01-01` : undefined;
              videoTags = data.genres;
              videoActors = data.castDetails?.map((c: any) => c.name) || data.cast;
            }
          } else if (pathname.startsWith("/artikel/") || pathname.startsWith("/article/")) {
            const slug = decodeURIComponent(pathname.replace(/^\/(?:artikel|article)\/?/, "")).replace(/\/$/, "");
            const data = await fetchEntityData("articles", slug);
            if (data) {
              title = `${data.seoTitle || data.title || "Artikel"} — Sotoy Film`;
              description = data.metaDescription || data.excerpt || (typeof data.content === "string" ? data.content.slice(0, 160) : "");
              image = data.ogImage || data.coverImage || "";
              type = "article";
              publishedTime = data.publishedAt;
            }
          }

          // Fallback to central route metadata builder if entity data wasn't matched
          if (!title) {
            const routeMeta = buildRouteMetadata(pathname, { currentUrl: `https://www.sotoyfilm.my.id${pathname}` });
            title = routeMeta.title;
            description = routeMeta.description;
            image = routeMeta.primaryImage;
            type = routeMeta.type;
          }

          const renderedHtml = injectMetaTags(baseHtml, {
            title,
            description,
            image: image || "https://www.sotoyfilm.my.id/og-default.png",
            url: `https://www.sotoyfilm.my.id${pathname}`,
            type,
            publishedTime,
            videoDirector,
            videoReleaseDate,
            videoTags,
            videoActors,
          });

          return res.status(200).type("html").send(renderedHtml);
        } catch (err) {
          console.error("[Server Bot Meta Injection Error]", err);
          return res.sendFile(indexPath);
        }
      }

      return res.sendFile(indexPath);
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
