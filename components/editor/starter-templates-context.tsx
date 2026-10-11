"use client";

import { createContext } from "react";

export const StarterTemplatesContext = createContext<{ isOpen: boolean; onClose: () => void } | null>(null);
