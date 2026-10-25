
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

type KnownClientError = { status: number; message: string };

const KNOWN_CLIENT_ERRORS = new Map<string, KnownClientError>([
  ["entity.parse.failed", { status: 400, message: "Invalid JSON in request body" }],
  ["entity.too.large", { status: 413, message: "Request body is too large" }],
  ["encoding.unsupported", { status: 415, message: "Unsupported content encoding" }],
  ["charset.unsupported", { status: 415, message: "Unsupported charset" }],
  ["request.aborted", { status: 400, message: "Request was aborted" }],
  ["request.size.invalid", { status: 400, message: "Request size does not match content length" }],
]);

function readErrorType(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  const { type } = error as Error & { type?: unknown };
  return typeof type === "string" ? type : null;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json(error.body);
    return;
  }

  const type = readErrorType(error);
  const known = type === null ? undefined : KNOWN_CLIENT_ERRORS.get(type);

  if (known) {
    res.status(known.status).json({ message: known.message });
    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.path}:`, error);
  res.status(500).json({ message: "Internal server error" });
}
