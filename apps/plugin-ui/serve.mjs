// Minimal static server for the dev harness (Windows-friendly: no stdin needed).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const port = Number(process.env.PORT ?? 8788);

http.createServer(async (req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  console.log(new Date().toISOString(), req.method, req.url);
  if (!path.startsWith(normalize(root))) { res.writeHead(403); res.end(); return; }
  try {
    const file = path.endsWith("\\") || path.endsWith("/") ? join(path, "dev.html") : path;
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`serving http://127.0.0.1:${port}/dev.html`));
