export interface SidebarProject {
  id: string;
  name: string;
  owned: boolean;
}

export function projectSlug(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 120).replace(/-+$/g, "");
}

export function projectRoomId(name: string, suffix: string) {
  return `${projectSlug(name) || "untitled-project"}-${suffix}`;
}

export function isProjectRoomId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 131 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{10}$/.test(value);
}

export function projectWorkspacePath(projectId: string) {
  return `/editor/${encodeURIComponent(projectId)}`;
}
