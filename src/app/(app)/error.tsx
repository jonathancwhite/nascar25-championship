"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// In-app error boundary (NASCAR-081). Renders a friendly fallback instead of a
// stack trace; the underlying error is logged server-side where it's thrown.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client breadcrumb; `digest` correlates with the server log entry.
    console.error("[app-error]", error.message, error.digest);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mt-2">
        An unexpected error occurred. You can try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
