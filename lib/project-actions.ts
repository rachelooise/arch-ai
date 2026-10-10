import { projectWorkspacePath, type SidebarProject } from "@/lib/project-room";

export type ProjectDialog = { type: "create" } | { type: "rename" | "delete"; project: SidebarProject };

interface ProjectRouter {
  push(path: string): void;
  replace(path: string): void;
  refresh(): void;
}

export async function mutateProject(
  dialog: ProjectDialog,
  name: string,
  roomId: string,
  pathname: string,
  router: ProjectRouter,
) {
  const response = await fetch(dialog.type === "create"
    ? "/api/projects" : `/api/projects/${encodeURIComponent(dialog.project.id)}`, {
    method: dialog.type === "create" ? "POST" : dialog.type === "rename" ? "PATCH" : "DELETE",
    ...(dialog.type === "delete" ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dialog.type === "create" ? { name: name.trim(), roomId } : { name: name.trim() }),
    }),
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error : "Unable to save the project. Please try again.";
    throw new Error(message);
  }

  if (dialog.type === "create") {
    const project: unknown = await response.json();
    if (!project || typeof project !== "object" || !("id" in project) || project.id !== roomId) {
      throw new Error("The project response did not match the room ID. Please refresh your projects.");
    }
    router.push(projectWorkspacePath(roomId));
    router.refresh();
  } else if (dialog.type === "delete" && pathname === projectWorkspacePath(dialog.project.id)) {
    router.replace("/editor");
    router.refresh();
  } else {
    router.refresh();
  }
}
