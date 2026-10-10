"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copyProjectLink, fetchProjectSharing, inviteProjectCollaborator, removeProjectCollaborator, type ProjectSharingData } from "@/lib/project-sharing";

export function useProjectSharing(projectId: string) {
  const router = useRouter();
  const [data, setData] = useState<ProjectSharingData | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    void fetchProjectSharing(projectId, request.signal)
      .then(setData)
      .catch((cause) => { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load collaborators."); })
      .finally(() => { if (!request.signal.aborted) setIsLoading(false); });
    return () => {
      request.abort();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, [projectId]);

  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchProjectSharing(projectId, controller.current?.signal));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load collaborators.");
    } finally {
      setIsLoading(false);
    }
  }

  async function mutate(collaboratorId?: string) {
    if (!data?.isOwner || busy.current || isLoading) return;
    busy.current = true;
    setIsSaving(true);
    setError(null);
    try {
      if (collaboratorId) await removeProjectCollaborator(projectId, collaboratorId, controller.current?.signal);
      else await inviteProjectCollaborator(projectId, email, controller.current?.signal);
      setEmail("");
      setData(await fetchProjectSharing(projectId, controller.current?.signal));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update project access.");
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }

  async function copyLink() {
    if (!data?.isOwner) return;
    setError(null);
    try {
      await copyProjectLink(projectId);
      if (controller.current?.signal.aborted) return;
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy the link. Please try again.");
    }
  }

  return { data, email, setEmail, isLoading, isSaving, error, copied, reload, mutate, copyLink };
}
