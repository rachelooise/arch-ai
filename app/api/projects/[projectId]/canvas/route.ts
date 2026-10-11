import { del, get, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { authorizeProjectSharing } from "@/lib/project-collaborators";
import { MAX_CANVAS_BYTES, parseCanvasState } from "@/lib/canvas-state";

type ProjectContext = { params: Promise<{ projectId: string }> };
const headers = { "Cache-Control": "private, no-store" };
function failureMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/No blob credentials found|No read-write token found/.test(message)) return "Canvas storage is not configured. Set BLOB_READ_WRITE_TOKEN on the server and restart the app.";
  if (/unauthorized|forbidden|invalid.*token|access denied/i.test(message)) return "Canvas storage access was denied. Check the server's Blob token and store permissions.";
  if (/access.*private|private.*access|public.*store|private.*store/i.test(message)) return "Canvas storage requires a private Vercel Blob store. Check the configured store's access setting.";
  return fallback;
}

export async function GET(_request: Request, { params }: ProjectContext) {
  const { projectId } = await params;
  const access = await authorizeProjectSharing(projectId);
  if (access instanceof Response) return access;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { canvasJsonPath: true } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404, headers });
    if (!project.canvasJsonPath) return Response.json(null, { headers });
    const blob = await get(project.canvasJsonPath, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return Response.json({ error: "Saved canvas could not be loaded" }, { status: 502, headers });
    const state = parseCanvasState(await new Response(blob.stream).json());
    if (!state) return Response.json({ error: "Saved canvas is invalid" }, { status: 502, headers });
    return Response.json(state, { headers });
  } catch (error) {
    console.error("Canvas load failed", error);
    return Response.json({ error: failureMessage(error, "Unable to load canvas. Check the server logs for details and retry.") }, { status: 500, headers });
  }
}

export async function PUT(request: Request, { params }: ProjectContext) {
  const { projectId } = await params;
  const access = await authorizeProjectSharing(projectId);
  if (access instanceof Response) return access;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_CANVAS_BYTES) return Response.json({ error: "Canvas is too large" }, { status: 413, headers });
  let state;
  try { state = parseCanvasState(JSON.parse(text)); } catch { /* Invalid JSON is rejected below. */ }
  if (!state) return Response.json({ error: "Invalid canvas state" }, { status: 400, headers });

  let uploaded: string | undefined;
  let stage = "database";
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { canvasJsonPath: true } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404, headers });
    stage = "storage";
    const blob = await put(`canvases/${encodeURIComponent(projectId)}/canvas.json`, JSON.stringify(state), {
      access: "private", contentType: "application/json", addRandomSuffix: true,
    });
    uploaded = blob.url;
    stage = "database";
    await prisma.project.update({ where: { id: projectId }, data: { canvasJsonPath: blob.url }, select: { id: true } });
    if (project.canvasJsonPath && project.canvasJsonPath !== blob.url) await del(project.canvasJsonPath).catch(() => {});
    return Response.json({ saved: true }, { headers });
  } catch (error) {
    console.error(`Canvas save failed (${stage})`, error);
    if (uploaded) await del(uploaded).catch(() => {});
    return Response.json({ error: failureMessage(error, stage === "storage" ? "Unable to upload canvas to storage. Check the server logs for details and retry." : "Unable to update the project's saved canvas. Check the database connection and server logs, then retry.") }, { status: 500, headers });
  }
}
