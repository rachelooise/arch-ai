"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { projectRoomId } from "@/lib/project-room";
import { mutateProject, type ProjectDialog } from "@/lib/project-actions";

export function useProjectActions() {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef(false);
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomId = suffix ? projectRoomId(name, suffix) : "";

  function openDialog(next: ProjectDialog) {
    if (pending.current || (next.type !== "create" && !next.project.owned)) return;
    setName(next.type === "create" ? "" : next.project.name);
    setSuffix(next.type === "create" ? crypto.randomUUID().replace(/-/g, "").slice(0, 10) : "");
    setError(null);
    setDialog(next);
  }

  function closeDialog() {
    if (!pending.current) {
      setDialog(null);
      setError(null);
    }
  }

  async function submit() {
    if (!dialog || pending.current || (dialog.type !== "delete" && !name.trim())) return;
    pending.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await mutateProject(dialog, name, roomId, pathname, router);
      setDialog(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the project. Please try again.");
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  }

  return { dialog, name, setName, roomId, isLoading, error, openDialog, closeDialog, submit };
}
