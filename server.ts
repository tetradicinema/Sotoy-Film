import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import compression from "compression";
import { handleTmdbRequest } from "./api/tmdb";
import { handleImageProxy } from "./api/image-proxy";
import { isBotUserAgent } from "./src/lib/edge/botDetection";
import { injectMetaTags, FALLBACK_HTML_TEMPLATE } from "./src/lib/edge/metaInjection";
import { buildRouteMetadata } from "./src/utils/seoMetadata";
import { fetchEntityData } from "./src/lib/edge/firestoreRest";
import { requestLogger } from "./src/middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler";
import { apiLimiter, tmdbLimiter, imageProxyLimiter } from "./src/middleware/rateLimiter";
import { optionalAuth } from "./src/middleware/auth";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // SECURITY MIDDLEWARE (Applied globally)
  // 1. Helmet - Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://firestore.googleapis.com", "https://firebase.googleapis.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://api.themoviedb.org"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some Firebase features
  }));

  // 2. Compression - Gzip/Brotli
  app.use(compression());

  // 3. Request logging with correlation ID
  app.use(requestLogger);

  // 4. JSON body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API ROUTES
  // Health check (no rate limiting, no auth)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // TMDB Proxy - Protected dengan rate limiting dan optional auth
  app.get("/api/tmdb", tmdbLimiter, optionalAuth, (req, res) => {
    return handleTmdbRequest(req, res);
  });

  // Image Proxy - Protected dengan rate limiting
  app.all("/api/image-proxy", imageProxyLimiter, (req, res) => {
    return handleImageProxy(req, res);
  });

  // Explicit XML Sitemap & robots.txt routes with correct MIME types
  app.get("/sitemap.xml", (req, res) => {
    const candidatePaths = [
      path.join(process.cwd(), "dist", "sitemap.xml"),
      path.join(process.cwd(), "public", "sitemap.xml"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return res.status(200).type("application/xml; charset=utf-8").sendFile(p);
      }
    }
    return res.status(404).type("text/plain").send("sitemap.xml not found");
  });

  app.get("/robots.txt", (req, res) => {
    const candidatePaths = [
      path.join(process.cwd(), "dist", "robots.txt"),
      path.join(process.cwd(), "public", "robots.txt"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return res.status(200).type("text/plain; charset=utf-8").sendFile(p);
      }
    }
    return res.status(404).type("text/plain").send("robots.txt not found");
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

          let schemaJson: Record<string, any> | undefined;

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
              schemaJson = {
                "@context": "https://schema.org",
                "@type": data.type === "series" ? "TVSeries" : "Movie",
                name: data.title || title,
                alternateName: data.originalTitle || undefined,
                description,
                image: [image || "https://www.sotoyfilm.my.id/og-default.png"],
                datePublished: data.releaseDate || (data.year ? `${data.year}-01-01` : undefined),
                director: data.director ? { "@type": "Person", name: data.director } : undefined,
                actor: data.castDetails?.map((c: any) => ({ "@type": "Person", name: c.name })) || data.cast?.map((name: string) => ({ "@type": "Person", name })),
                genre: data.genres,
                aggregateRating: (data.totalVotes > 0 && data.skorSotoy > 0) ? {
                  "@type": "AggregateRating",
                  ratingValue: Number(Number(data.skorSotoy).toFixed(1)),
                  bestRating: "10.0",
                  worstRating: "1.0",
                  ratingCount: Number(data.totalVotes),
                } : undefined,
              };
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
              schemaJson = {
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                headline: data.seoTitle || data.title || title,
                description,
                image: [image || "https://www.sotoyfilm.my.id/og-default.png"],
                datePublished: data.publishedAt,
                dateModified: data.updatedAt || data.publishedAt,
                author: data.author?.name ? { "@type": "Person", name: data.author.name } : undefined,
                publisher: {
                  "@type": "Organization",
                  name: "Sotoy Film",
                  url: "https://www.sotoyfilm.my.id",
                  logo: { "@type": "ImageObject", url: "https://www.sotoyfilm.my.id/stacked%20logo-sotoyfilm.PNG" },
                },
                mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.sotoyfilm.my.id${pathname}` },
              };
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
            schemaJson,
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

  // ERROR HANDLING MIDDLEWARE (Must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🎬 Sotoy Film Server                                        ║
║  Port: ${PORT.toString().padEnd(51)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(45)}║
║  Started: ${new Date().toISOString().padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(err => {
  console.error("❌ Critical error starting server:", err);
  process.exit(1);
});
