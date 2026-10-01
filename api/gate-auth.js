import crypto from "node:crypto";

const COOKIE_NAME = "vmt_gate_access";
const SESSION_SECONDS = 60 * 60 * 12;
const TEMP_PASSWORD_DIGEST =
  "8f91763c51446448fbd166cf219aa97c5190178381e166e2b9880662f4d9e71f";
const TEMP_SESSION_SECRET =
  "virgimontela-gate-prototype-2026-8d705d71e86f4a0a";

function digestHex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createSessionToken(passwordDigest, sessionSecret) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(`virgimontela-gate-v1:${passwordDigest}`)
    .digest("hex");
}

function safelyMatches(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

async function readForm(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") {
    return Object.fromEntries(new URLSearchParams(request.body));
  }

  let body = "";
  for await (const chunk of request) body += chunk;
  return Object.fromEntries(new URLSearchParams(body));
}

function redirect(response, location) {
  response.statusCode = 303;
  response.setHeader("Location", location);
  response.end();
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const form = await readForm(request);

  if (form.action === "logout") {
    response.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    );
    redirect(response, "/gate-login?logged_out=1");
    return;
  }

  const expectedPasswordDigest = process.env.GATE_PASSWORD
    ? digestHex(process.env.GATE_PASSWORD)
    : TEMP_PASSWORD_DIGEST;
  const sessionSecret =
    process.env.GATE_SESSION_SECRET ||
    process.env.VERCEL_PROJECT_ID ||
    TEMP_SESSION_SECRET;
  const submittedPassword = String(form.password || "");
  const submittedPasswordDigest = digestHex(submittedPassword);

  if (!safelyMatches(submittedPasswordDigest, expectedPasswordDigest)) {
    redirect(response, "/gate-login?error=1");
    return;
  }

  const token = createSessionToken(expectedPasswordDigest, sessionSecret);
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
  );
  redirect(response, "/gate");
}
