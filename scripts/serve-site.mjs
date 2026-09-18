import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/site/", import.meta.url)).replace(/[\\/]$/, "");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".mp4": "video/mp4", ".vtt": "text/vtt" };
http.createServer(async (request, response) => {
  try {
    let route = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    // Also exercise the eventual GitHub Pages repository base path locally.
    route = route.replace(/^\/project-visual-team(?=\/|$)/, "") || "/";
    if (route.endsWith("/")) route += "index.html";
    const file = resolve(root, "." + route);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch { response.writeHead(404).end("Not found"); }
}).listen(8789, "127.0.0.1", () => console.log("Launch preview: http://127.0.0.1:8789/project-visual-team/"));
