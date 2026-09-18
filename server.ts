import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. API ROUTES FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
