import { apiError, logError } from "@/lib/http";

/** Wraps a Route Handler so unexpected failures are logged once and returned as a stable 500 body. */
export async function guard(event: string, handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    logError(event, error);
    return apiError(500, "internal_error", "Something went wrong on our side. Please try again.");
  }
}
