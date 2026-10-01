import { next } from "@vercel/functions";

const COOKIE_NAME = "vmt_gate_access";
const TEMP_PASSWORD_DIGEST =
  "8f91763c51446448fbd166cf219aa97c5190178381e166e2b9880662f4d9e71f";
const TEMP_SESSION_SECRET =
  "virgimontela-gate-prototype-2026-8d705d71e86f4a0a";
const encoder = new TextEncoder();

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function digestHex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createSessionToken(passwordDigest, sessionSecret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`virgimontela-gate-v1:${passwordDigest}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  matcher: ["/gate", "/gate.html", "/assets/gate/:path*"],
};

export default async function middleware(request) {
  const passwordDigest = process.env.GATE_PASSWORD
    ? await digestHex(process.env.GATE_PASSWORD)
    : TEMP_PASSWORD_DIGEST;
  const sessionSecret =
    process.env.GATE_SESSION_SECRET ||
    process.env.VERCEL_PROJECT_ID ||
    TEMP_SESSION_SECRET;

  const expectedToken = await createSessionToken(passwordDigest, sessionSecret);
  const providedToken = readCookie(request, COOKIE_NAME);

  if (providedToken === expectedToken) {
    return next({
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  const loginUrl = new URL("/gate-login", request.url);
  loginUrl.searchParams.set("next", "/gate");
  return Response.redirect(loginUrl, 302);
}
