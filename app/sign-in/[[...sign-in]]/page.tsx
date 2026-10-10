import { SignIn } from "@clerk/nextjs";

import { AuthLayout } from "@/components/auth/auth-layout";
import { signInUrl } from "@/lib/auth-routes";

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn routing="path" path={signInUrl} />
    </AuthLayout>
  );
}
