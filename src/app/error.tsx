"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Client-side record of the boundary hit (the server route already logged via guard()).
  console.error(error);
  return (
    <div className="page-x mx-auto max-w-2xl py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-ink-soft">We hit an unexpected problem loading this page. Please try again.</p>
      <button type="button" onClick={reset} className="btn btn-dark mt-8">
        Try again
      </button>
    </div>
  );
}
