"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-gray-500 text-sm">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
