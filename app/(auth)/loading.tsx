import { AuthFormSkeleton } from "@/components/auth/auth-form";
import { PageTransition } from "@/components/shell/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <AuthFormSkeleton />
    </PageTransition>
  );
}
