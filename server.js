const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "site.json");
const AUTH_FILE = path.join(ROOT, "data", "auth.json");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE = "wf_admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const sessions = new Set();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function redirect(res, location) {
  res.writeHead(302, {
    location,
    "cache-control": "no-store"
  });
  res.end();
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;
      cookies[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(part.slice(index + 1));
      return cookies;
    }, {});
}

function sessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || "";
}

function isAuthenticated(req) {
  const token = sessionToken(req);
  return Boolean(token && sessions.has(token));
}

function secureCookieFlag(req) {
  return req.socket.encrypted || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function setSessionCookie(req, res, token) {
  const secure = secureCookieFlag(req) ? "; Secure" : "";
  res.setHeader("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
}

function clearSessionCookie(req, res) {
  const secure = secureCookieFlag(req) ? "; Secure" : "";
  res.setHeader("set-cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const next = passwordHash(password, record.salt).hash;
  if (next.length !== record.hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(next, "hex"), Buffer.from(record.hash, "hex"));
}

async function readAuth() {
  try {
    return JSON.parse(await fsp.readFile(AUTH_FILE, "utf8"));
  } catch {
    const next = passwordHash(DEFAULT_ADMIN_PASSWORD);
    const auth = { version: "1.0", password: next };
    await fsp.writeFile(AUTH_FILE, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
    return auth;
  }
}

async function writeAuthPassword(password) {
  const auth = { version: "1.0", password: passwordHash(password) };
  await fsp.writeFile(AUTH_FILE, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
}

function acceptsGzip(req) {
  return /\bgzip\b/i.test(String(req.headers["accept-encoding"] || ""));
}

function cacheControlFor(ext, target) {
  if (ext === ".html") return "no-store";
  if (target.startsWith(UPLOAD_DIR) || target.includes(`${path.sep}assets${path.sep}`)) {
    return "public, max-age=31536000, immutable";
  }
  if ([".css", ".js", ".json"].includes(ext)) {
    return "public, max-age=300, must-revalidate";
  }
  return "public, max-age=3600";
}

function shouldGzip(ext, stat) {
  return stat.size > 1024 && [".html", ".css", ".js", ".json", ".svg"].includes(ext);
}

function requireAdmin(req, res) {
  if (isAuthenticated(req)) return true;
  if (req.url.startsWith("/api/")) {
    sendJson(res, 401, { ok: false, message: "请先登录后台。" });
  } else {
    redirect(res, "/admin-login.html");
  }
  return false;
}

function readBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("上传内容太大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function cleanFileName(name) {
  return String(name || "upload")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "upload";
}

function extensionFor(mime, originalName) {
  const original = path.extname(originalName || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(original)) return original;
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

async function parseMultipartUpload(req) {
  const type = req.headers["content-type"] || "";
  const boundaryMatch = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("没有找到上传边界，请重新选择图片上传。");

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`, "utf8");
  const body = await readBody(req, 80 * 1024 * 1024);
  const rawParts = splitBuffer(body, boundary);
  const files = [];

  await fsp.mkdir(UPLOAD_DIR, { recursive: true });

  for (let raw of rawParts) {
    if (!raw.length) continue;
    if (raw.subarray(0, 2).toString() === "\r\n") raw = raw.subarray(2);
    if (raw.subarray(0, 2).toString() === "--") continue;

    const headerEnd = raw.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const headerText = raw.subarray(0, headerEnd).toString("utf8");
    let content = raw.subarray(headerEnd + 4);
    if (content.subarray(content.length - 2).toString() === "\r\n") {
      content = content.subarray(0, content.length - 2);
    }

    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
    const fileNameMatch = disposition && disposition[1].match(/filename="([^"]*)"/i);
    if (!fileNameMatch || !fileNameMatch[1] || !content.length) continue;

    const contentType = (headerText.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("只能上传图片文件。");

    const original = cleanFileName(fileNameMatch[1]);
    const ext = extensionFor(contentType, original);
    const stored = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;
    const target = path.join(UPLOAD_DIR, stored);
    await fsp.writeFile(target, content);
    files.push({
      name: original,
      url: `/uploads/${stored}`,
      size: content.length,
      type: contentType
    });
  }

  return files;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/auth/status" && req.method === "GET") {
    sendJson(res, 200, { ok: true, authenticated: isAuthenticated(req) });
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req, 1024 * 32);
    const data = JSON.parse(body.toString("utf8") || "{}");
    const auth = await readAuth();
    if (!verifyPassword(data.password, auth.password)) {
      sendJson(res, 401, { ok: false, message: "密码不正确。" });
      return;
    }
    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    setSessionCookie(req, res, token);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const token = sessionToken(req);
    if (token) sessions.delete(token);
    clearSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/auth/password" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req, 1024 * 32);
    const data = JSON.parse(body.toString("utf8") || "{}");
    const auth = await readAuth();
    if (!verifyPassword(data.currentPassword, auth.password)) {
      sendJson(res, 400, { ok: false, message: "当前密码不正确。" });
      return;
    }
    const nextPassword = String(data.nextPassword || "");
    if (nextPassword.length < 4) {
      sendJson(res, 400, { ok: false, message: "新密码至少需要 4 位。" });
      return;
    }
    await writeAuthPassword(nextPassword);
    sessions.clear();
    clearSessionCookie(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/site" && req.method === "GET") {
    const text = await fsp.readFile(DATA_FILE, "utf8");
    sendJson(res, 200, JSON.parse(text));
    return;
  }

  if (pathname === "/api/site" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req, 20 * 1024 * 1024);
    const data = JSON.parse(body.toString("utf8"));
    if (!data || !Array.isArray(data.destinations)) {
      sendJson(res, 400, { ok: false, message: "数据格式不正确：缺少 destinations。" });
      return;
    }
    await fsp.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    return;
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const files = await parseMultipartUpload(req);
    sendJson(res, 200, { ok: true, files });
    return;
  }

  sendJson(res, 404, { ok: false, message: "没有这个接口。" });
}

async function serveStatic(req, res, pathname) {
  let requestPath = pathname;
  if (requestPath === "/") requestPath = "/index.html";
  if (requestPath === "/admin") requestPath = "/admin.html";
  const adminOnly = ["/admin.html", "/admin.js"].includes(requestPath);
  if (adminOnly && !requireAdmin(req, res)) return;

  const decoded = decodeURIComponent(requestPath);
  const target = path.resolve(PUBLIC_DIR, decoded.replace(/^\/+/, ""));
  if (!isInside(PUBLIC_DIR, target)) {
    sendText(res, 403, "路径不允许访问。");
    return;
  }

  try {
    const stat = await fsp.stat(target);
    if (stat.isDirectory()) {
      sendText(res, 404, "没有找到页面。");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const headers = {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": cacheControlFor(ext, target),
      vary: "Accept-Encoding"
    };
    if (acceptsGzip(req) && shouldGzip(ext, stat)) {
      headers["content-encoding"] = "gzip";
      res.writeHead(200, headers);
      fs.createReadStream(target).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      res.writeHead(200, headers);
      fs.createReadStream(target).pipe(res);
    }
  } catch {
    sendText(res, 404, "没有找到页面。");
  }
}

async function ensureFolders() {
  await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fsp.mkdir(PUBLIC_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await readAuth();
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message || "服务器出错了。" });
  }
});

ensureFolders()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`世界碎片已启动：http://localhost:${PORT}`);
      console.log(`后台管理：http://localhost:${PORT}/admin`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
