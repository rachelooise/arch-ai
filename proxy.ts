import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { signInUrl, signUpUrl } from "@/lib/auth-routes";

const isPublicRoute = createRouteMatcher([
  signInUrl,
  `${signInUrl}/(.*)`,
  signUpUrl,
  `${signUpUrl}/(.*)`,
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, { signInUrl, signUpUrl });

export const config = {
  matcher: [
    // Skip Next.js internals and static assets; always protect API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
