import { auth, currentUser } from "@clerk/nextjs/server";

import { getCursorColor } from "@/lib/cursor-color";
import { getLiveblocks } from "@/lib/liveblocks";
import { getProjectAccess } from "@/lib/project-access";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const room = body && typeof body === "object" && "room" in body ? body.room : null;
  if (typeof room !== "string" || !room.trim() || room.length > 256 || room.includes("*")) {
    return Response.json({ error: "A valid project room ID is required" }, { status: 400 });
  }
  const project = await getProjectAccess(room);
  if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

  const user = await currentUser();
  if (!user || user.id !== userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const liveblocks = getLiveblocks();
    await liveblocks.getOrCreateRoom(project.id, { defaultAccesses: [] });
    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: user.fullName || user.username || "Anonymous",
        avatar: user.imageUrl,
        color: getCursorColor(userId),
      },
    });
    session.allow(project.id, session.FULL_ACCESS);
    const { body: tokenBody, status } = await session.authorize();
    return new Response(tokenBody, {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Unable to authorize collaboration" }, { status: 503 });
  }
}
