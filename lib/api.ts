export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(body: T, status = 200) {
  return Response.json(body, { status });
}

export function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false }> {
  try {
    const parsed: unknown = await request.json();
    if (!isRecord(parsed)) {
      return { ok: false };
    }
    return { ok: true, body: parsed };
  } catch {
    return { ok: false };
  }
}
