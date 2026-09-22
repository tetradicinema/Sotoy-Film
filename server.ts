import express from "express";
import path from "path";
import fs from "fs";
import { handleTmdbRequest } from "./api/tmdb";
import { handleSitemapRequest } from "./api/sitemap";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware for POST bodies
  app.use(express.json());

  // 1. API ROUTES FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/client-error", (req, res) => {
    try {
      const logMsg = `[${new Date().toISOString()}] CLIENT ERROR:\n${JSON.stringify(req.body, null, 2)}\n\n`;
      fs.appendFileSync(path.join(process.cwd(), "client-errors.log"), logMsg, "utf-8");
    } catch (e) {
      console.error("Failed to write to client-errors.log:", e);
    }
    res.sendStatus(204);
  });

  // TMDB Proxy route for catalog import (mirrors Vercel api/tmdb.ts)
  app.get("/api/tmdb", (req, res) => {
    return handleTmdbRequest(req, res);
  });

  // Dynamic Sitemap generation to prevent build-time Firestore/Node dependencies
  app.get("/sitemap.xml", (req, res) => {
    return handleSitemapRequest(req, res);
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
