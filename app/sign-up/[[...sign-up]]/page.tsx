import { SignUp } from "@clerk/nextjs";

import { AuthLayout } from "@/components/auth/auth-layout";
import { signUpUrl } from "@/lib/auth-routes";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp routing="path" path={signUpUrl} />
    </AuthLayout>
  );
}
