"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-gray-500 text-sm">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
