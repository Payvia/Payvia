export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    options?: ErrorOptions & { details?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "ApiError";
    this.details = options?.details ?? {};
  }

  /** Extra fields the backend sent with the error, such as a Stellar code. */
  readonly details: Record<string, unknown>;
}

/**
 * Use this instead of `instanceof ApiError` in server code. The mock store is
 * shared across server bundles, and each bundle gets its own copy of the
 * class, so an error thrown by one is not an instance of another's.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    error.name === "ApiError" &&
    typeof (error as ApiError).status === "number" &&
    typeof (error as ApiError).code === "string"
  );
}

export const errors = {
  unauthorized: () => new ApiError("unauthorized", "Log in to continue.", 401),
  invalidCredentials: () =>
    new ApiError("invalid_credentials", "Email or password is incorrect.", 401),
  emailTaken: () =>
    new ApiError(
      "email_taken",
      "An account with this email already exists.",
      409,
    ),
  notFound: (what = "Payment request") =>
    new ApiError("not_found", `${what} not found.`, 404),
  notCancellable: () =>
    new ApiError(
      "not_cancellable",
      "This request can no longer be cancelled.",
      409,
    ),
  notPayable: () =>
    new ApiError(
      "not_payable",
      "This payment request is no longer active.",
      409,
    ),
  invalid: (message: string) => new ApiError("invalid_request", message, 400),
};
