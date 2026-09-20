import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables into process.env for serverless function handlers
// (Vite only auto-exposes VITE_* prefixed vars to the client)
function loadEnvIntoProcess() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Maps /api/<name> to the corresponding Netlify function handler
function apiDevPlugin() {
  const handlers: Record<string, (request: Request) => Promise<Response> | Response> = {};

  async function loadHandler(name: string) {
    if (!handlers[name]) {
      try {
        const mod = await import(`./netlify/functions/${name}.ts`);
        handlers[name] = mod.default;
      } catch {
        return null;
      }
    }
    return handlers[name];
  }

  return {
    name: "api-dev-server",
    configureServer(server: any) {
      // Ensure .env is loaded before any API request
      loadEnvIntoProcess();

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const match = req.url?.match(/^\/api\/([a-z-]+)/);
        if (!match) return next();

        const handlerName = match[1];
        const handler = await loadHandler(handlerName);
        if (!handler) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: `API route "${handlerName}" not found.` }));
          return;
        }

        try {
          // Collect request body
          const chunks: Buffer[] = [];
          if (req.method !== "GET" && req.method !== "HEAD") {
            await new Promise<void>((resolve, reject) => {
              req.on("data", (chunk: Buffer) => chunks.push(chunk));
              req.on("end", resolve);
              req.on("error", reject);
            });
          }
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

          // Build the Web API Request object
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost";
          const url = new URL(req.url || "/", `${protocol}://${host}`);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers.set(key, value);
            else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
          }

          const webRequest = new Request(url, {
            method: req.method,
            headers,
            body: body,
          });

          const webResponse = await handler(webRequest);

          // Write the response back
          res.statusCode = webResponse.status;
          webResponse.headers.forEach((value: string, name: string) => res.setHeader(name, value));
          res.end(Buffer.from(await webResponse.arrayBuffer()));
        } catch (error) {
          console.error(`API handler "${handlerName}" error:`, error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "Internal server error." }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [apiDevPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
