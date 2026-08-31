import { defineMiddleware } from "astro:middleware";

// Baseline hardening headers on every response. Deliberately no restrictive
// script-src CSP here: the app relies heavily on inline <script> tags across
// .astro pages, and a strict CSP without nonces would break them.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
});
