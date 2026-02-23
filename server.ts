import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/**
 * ATENÇÃO: O banco SQLite foi removido desta camada para evitar perda de dados.
 * O App agora deve usar exclusivamente o Firebase configurado em /src/lib/firebase.ts
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Servir arquivos estáticos do Vite em Produção
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Rotas de API que antes usavam SQLite agora retornam aviso ou podem ser integradas
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", database: "firebase_active" });
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // Modo Desenvolvimento com Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();