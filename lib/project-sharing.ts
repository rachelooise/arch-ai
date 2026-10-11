import { projectWorkspacePath } from "@/lib/project-room";

export interface ProjectCollaborator {
  id: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}

export interface ProjectSharingData {
  isOwner: boolean;
  collaborators: ProjectCollaborator[];
}

async function sharingRequest(projectId: string, options?: RequestInit, collaboratorId?: string) {
  const path = `/api/projects/${encodeURIComponent(projectId)}/collaborators`;
  const response = await fetch(collaboratorId ? `${path}/${encodeURIComponent(collaboratorId)}` : path, options);
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error : "Unable to update project access. Please try again.");
  }
  return response;
}

export async function fetchProjectSharing(projectId: string, signal?: AbortSignal): Promise<ProjectSharingData> {
  const response = await sharingRequest(projectId, { signal, cache: "no-store" });
  return response.json();
}

export async function inviteProjectCollaborator(projectId: string, email: string, signal?: AbortSignal) {
  await sharingRequest(projectId, {
    method: "POST", signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function removeProjectCollaborator(projectId: string, collaboratorId: string, signal?: AbortSignal) {
  await sharingRequest(projectId, { method: "DELETE", signal }, collaboratorId);
}

export async function copyProjectLink(projectId: string) {
  await navigator.clipboard.writeText(new URL(projectWorkspacePath(projectId), window.location.origin).href);
}
