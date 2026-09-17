export function jsonResponse(body: unknown, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export async function readJsonBody(request: Request, maxBytes = 10_000_000) {
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
