import express from "express";
import path from "path";
import { handleTmdbRequest } from "./api/tmdb";

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

  // Image Proxy route for canvas rendering without CORS tainting
  app.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Missing or invalid url parameter" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch image, status: ${response.status}` });
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to proxy image" });
    }
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
