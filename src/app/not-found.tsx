import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// Friendly 404 (NASCAR-081), also rendered for `notFound()` (e.g. a league a
// user can't see), so it must not reveal whether the resource exists.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-2">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="mt-6">
        <Link href="/dashboard" className={buttonVariants()}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
