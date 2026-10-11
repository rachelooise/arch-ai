import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-base px-6 text-center">
      <LockKeyhole className="h-10 w-10 text-copy-muted" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="max-w-sm text-sm text-copy-muted">This project is unavailable or you do not have access.</p>
      <Link href="/editor" className="text-sm font-medium text-brand underline-offset-4 hover:underline">Back to projects</Link>
    </div>
  );
}
