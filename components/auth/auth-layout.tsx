import { Suspense, type ReactNode } from "react";
import { Layers } from "lucide-react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh w-full bg-base lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden min-w-0 flex-col justify-center border-r border-surface-border bg-auth-panel px-12 py-10 lg:flex xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-12 flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <Layers className="size-5 text-brand" aria-hidden="true" />
            <span>Arch AI</span>
          </div>
          <h1 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight">A workspace for your next idea.</h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-copy-secondary">Bring your projects together in one focused editor.</p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-copy-secondary marker:text-brand list-disc pl-4">
            <li>A dedicated canvas for your work</li>
            <li>Your projects, organized in one place</li>
            <li>A clear view of what matters</li>
          </ul>
        </div>
      </aside>
      <section aria-label="Account access" className="flex min-w-0 items-center justify-center bg-base px-4 py-8 sm:px-8 lg:px-12">
        <Suspense fallback={<p role="status" className="text-sm text-copy-muted">Loading account access...</p>}>
          {children}
        </Suspense>
      </section>
    </main>
  );
}
