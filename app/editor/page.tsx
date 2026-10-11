import { NewProjectButton } from "@/components/editor/new-project-button";

export default function EditorPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Create a project or open an existing one</h1>
      <p className="text-sm text-copy-muted">Start a new architecture workspace, or choose a project from the sidebar.</p>
      <NewProjectButton />
    </div>
  );
}
