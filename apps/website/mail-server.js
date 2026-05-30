const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, ".env");
const MAX_BODY_BYTES = 64 * 1024;

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const HOST = process.env.MAIL_SERVER_HOST || "127.0.0.1";
const PORT = Number(process.env.MAIL_SERVER_PORT || 8012);
const MAIL_TO = process.env.MAIL_TO || "IT22561770@my.sliit.lk";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept",
  });
  res.end(JSON.stringify(payload));
}

function sendCorsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept",
    "Access-Control-Max-Age": "86400",
  });
  res.end();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set in apps/website/.env",
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function handleContact(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, message: error.message });
    return;
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const subject = String(payload.subject || "").trim();
  const message = String(payload.message || "").trim();

  if (!name || !email || !subject || !message) {
    sendJson(res, 400, {
      ok: false,
      message: "Name, email, subject, and message are required.",
    });
    return;
  }
  if (!isEmail(email)) {
    sendJson(res, 400, {
      ok: false,
      message: "Please enter a valid email address.",
    });
    return;
  }

  let transport;
  try {
    transport = createTransport();
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message });
    return;
  }

  const fromName =
    process.env.MAIL_FROM_NAME || "Adaptive Smart Irrigation Website";
  const gmailUser = process.env.GMAIL_USER;
  const text = `From: ${name} <${email}>\n\n${message}`;
  const html = `
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <hr />
    <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
  `;

  try {
    await transport.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to: MAIL_TO,
      replyTo: email,
      subject,
      text,
      html,
    });
    sendJson(res, 200, { ok: true, message: "Message sent successfully." });
  } catch (error) {
    console.error("Failed to send contact email", error);
    sendJson(res, 502, {
      ok: false,
      message:
        "Gmail could not send the message. Check the Gmail address and app password.",
    });
  }
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function serveStatic(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || `${HOST}:${PORT}`}`,
  );
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath =
    pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(ROOT, relativePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const contentType =
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendCorsPreflight(res);
    return;
  }

  if (req.url && req.url.startsWith("/api/contact")) {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, message: "Method not allowed" });
      return;
    }
    handleContact(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.listen(PORT, HOST, () => {
  console.log(`Website and Gmail mail API running at http://${HOST}:${PORT}`);
  console.log(
    "Create apps/website/.env from .env.example and set GMAIL_USER/GMAIL_APP_PASSWORD.",
  );
});
