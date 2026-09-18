import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || "3000", 10);
const DIST = path.resolve(__dirname, "dist");

// Load .env into process.env
function loadEnv() {
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// Lazy-load API handlers
const handlerCache: Record<string, (req: Request) => Promise<Response> | Response> = {};
async function loadHandler(name: string) {
  if (handlerCache[name]) return handlerCache[name];
  const tryPaths = [
    `./netlify/functions/${name}.ts`,
    `./netlify/functions/${name}.js`
  ];
  for (const p of tryPaths) {
    try {
      const mod = await import(p);
      handlerCache[name] = mod.default;
      return handlerCache[name];
    } catch {}
  }
  return null;
}

// Guess content type
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || "";
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "/";

  // --- API routes ---
  const apiMatch = url.match(/^\/api\/([a-z-]+)/);
  if (apiMatch) {
    const handler = await loadHandler(apiMatch[1]);
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API route not found." }));
      return;
    }
    try {
      const protocol = firstHeader(req.headers["x-forwarded-proto"]) || "http";
      const host = firstHeader(req.headers.host) || "localhost";
      const webUrl = new URL(url, `${protocol}://${host}`);

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (Array.isArray(v)) v.forEach((v) => headers.append(k, v));
        else if (v !== undefined) headers.set(k, v);
      }

      const chunks: Buffer[] = [];
      if (req.method !== "GET" && req.method !== "HEAD") {
        for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

      const webRes = await handler(new Request(webUrl, { method: req.method, headers, body }));
      res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
      res.end(Buffer.from(await webRes.arrayBuffer()));
    } catch (err) {
      console.error(`API error [${url}]:`, err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
    return;
  }

  // --- Static files ---
  let filePath = path.join(DIST, url === "/" ? "index.html" : url);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, "index.html"); // SPA fallback
  }
  try {
    const ext = path.extname(filePath);
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

loadEnv();
const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
