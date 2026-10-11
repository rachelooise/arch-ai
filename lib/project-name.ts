export async function readProjectName(request: Request, defaultName?: string) {
  let body: unknown;

  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { error: "Invalid JSON body." } as const;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Expected a JSON object." } as const;
  }

  const name = "name" in body ? body.name : defaultName;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Project name must be a non-empty string." } as const;
  }

  return { name: name.trim(), roomId: "roomId" in body ? body.roomId : undefined } as const;
}
