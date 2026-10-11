"use client";

import Image from "next/image";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectSharing } from "@/hooks/use-project-sharing";
import type { SidebarProject } from "@/lib/project-room";

export function ShareDialog({ project, onClose }: { project: SidebarProject; onClose: () => void }) {
  const sharing = useProjectSharing(project.id);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !sharing.isSaving) onClose(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!sharing.isSaving} aria-busy={sharing.isLoading || sharing.isSaving}>
        <DialogHeader>
          <DialogTitle>Share {project.name}</DialogTitle>
          <DialogDescription>{sharing.data?.isOwner ? "Invite collaborators and manage project access." : "View the people who have access to this project."}</DialogDescription>
        </DialogHeader>
        {sharing.isLoading ? <p role="status" className="text-sm text-copy-muted">Loading collaborators…</p> : sharing.data && <>
          {sharing.data.isOwner && <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); void sharing.mutate(); }}>
            <label htmlFor="collaborator-email" className="text-sm font-medium">Invite by email</label>
            <div className="flex gap-2">
              <Input id="collaborator-email" type="email" autoComplete="email" required placeholder="name@example.com"
                value={sharing.email} disabled={sharing.isSaving} onChange={(event) => sharing.setEmail(event.target.value)} className="min-w-0 text-copy-primary" />
              <Button type="submit" disabled={sharing.isSaving || !sharing.email.trim()}>Invite</Button>
            </div>
          </form>}
          <div className="grid gap-3">
            <h2 className="text-sm font-medium">Collaborators</h2>
            {sharing.data.collaborators.length ? <ul className="max-h-64 space-y-3 overflow-y-auto">
              {sharing.data.collaborators.map((collaborator) => <li key={collaborator.id} className="flex items-center gap-3">
                {collaborator.imageUrl && <Image src={collaborator.imageUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-full" />}
                <div className="min-w-0 flex-1">
                  {collaborator.displayName && <p className="truncate text-sm font-medium">{collaborator.displayName}</p>}
                  <p className="break-all text-sm text-copy-muted">{collaborator.email}</p>
                </div>
                {sharing.data?.isOwner && <Button type="button" variant="ghost" size="icon-sm" disabled={sharing.isSaving}
                  aria-label={`Remove ${collaborator.email}`} onClick={() => void sharing.mutate(collaborator.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>}
              </li>)}
            </ul> : <p className="text-sm text-copy-muted">No collaborators yet.</p>}
          </div>
          {sharing.data.isOwner && <Button type="button" variant="outline" onClick={() => void sharing.copyLink()}>
            <Copy className="h-4 w-4" aria-hidden="true" /><span aria-live="polite">{sharing.copied ? "Copied!" : "Copy project link"}</span>
          </Button>}
        </>}
        {sharing.error && <div className="grid gap-2"><p role="alert" className="text-sm text-error">{sharing.error}</p>
          {!sharing.isLoading && <Button type="button" variant="outline" disabled={sharing.isSaving} onClick={() => void sharing.reload()}>Reload collaborators</Button>}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
