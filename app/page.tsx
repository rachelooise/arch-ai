import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signInUrl } from "@/lib/auth-routes";

async function AuthRedirect() {
  const { userId } = await auth();
  return redirect(userId ? "/editor" : signInUrl);
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthRedirect />
    </Suspense>
  );
}
