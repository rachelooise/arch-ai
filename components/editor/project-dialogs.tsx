"use client";

import { createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectActions } from "@/hooks/use-project-actions";

export const ProjectDialogsContext = createContext<ReturnType<typeof useProjectActions> | null>(null);

export function useProjects() {
  const context = useContext(ProjectDialogsContext);
  if (!context) throw new Error("useProjects requires the editor shell");
  return context;
}

export function ProjectDialogs() {
  const { dialog, name, setName, roomId, isLoading, error, closeDialog, submit } = useProjects();
  const title = dialog?.type === "delete" ? "Delete Project" : dialog?.type === "rename" ? "Rename Project" : "Create Project";

  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <DialogContent showCloseButton={!isLoading}>
        <form className="grid gap-4" aria-busy={isLoading} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {dialog?.type === "delete" ? `Delete “${dialog.project.name}”? This action cannot be undone.` : dialog?.type === "rename" ? `Choose a new name for “${dialog.project.name}”.` : "Name your new architecture workspace."}
            </DialogDescription>
          </DialogHeader>
          {dialog?.type !== "delete" && (
            <div className="grid gap-2">
              <label htmlFor="project-name" className="text-sm font-medium">Project name</label>
              <Input id="project-name" className="text-copy-primary caret-copy-primary disabled:opacity-100" autoFocus required value={name} disabled={isLoading} onChange={(event) => setName(event.target.value)} />
              {dialog?.type === "create" && <p className="break-all text-sm text-copy-muted" aria-live="polite">Room ID: <span className="font-mono">{roomId || "—"}</span></p>}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
            <Button type="submit" variant={dialog?.type === "delete" ? "destructive" : "default"} disabled={isLoading || (dialog?.type !== "delete" && !name.trim())}>
              {isLoading ? "Saving…" : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
