"use client";

import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { CanvasSaveStatus } from "@/lib/canvas-autosave";

type SaveState = { status: CanvasSaveStatus; error?: string | null; onSave: (() => void) | null };
export const CanvasSaveContext = createContext<{ state: SaveState; setState: Dispatch<SetStateAction<SaveState>> } | null>(null);

export function CanvasSaveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>({ status: "saved", onSave: null });
  return <CanvasSaveContext.Provider value={{ state, setState }}>{children}</CanvasSaveContext.Provider>;
}
