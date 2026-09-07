export const LIBRARY_KEY = process.env.LIBRARY_KEY || "skc-local";

const ALLOWED_ORIGINS = [
  "https://pattarish-web.github.io",
  "http://127.0.0.1:43141",
  "http://localhost:43141",
  "http://127.0.0.1:43123",
  "http://localhost:43123",
];

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  const allow =
    !origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith("github.io")
      ? origin || "*"
      : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-library-key",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function authorize(request: Request): boolean {
  const key =
    request.headers.get("x-library-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return key === LIBRARY_KEY;
}

export function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}
