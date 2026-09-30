import { next } from "@vercel/functions";

const COOKIE_NAME = "vmt_gate_access";
const encoder = new TextEncoder();

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

async function createSessionToken(password, sessionSecret) {
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
    encoder.encode(`virgimontela-gate-v1:${password}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  matcher: ["/gate", "/gate.html", "/assets/gate/:path*"],
};

export default async function middleware(request) {
  const password = process.env.GATE_PASSWORD;
  const sessionSecret = process.env.GATE_SESSION_SECRET;

  if (!password || !sessionSecret) {
    return new Response("Akses halaman gate belum dikonfigurasi.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const expectedToken = await createSessionToken(password, sessionSecret);
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
