import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import type { ApiErrorBody, Money } from "@/types/api";

export const mediaUrlSchema = z
  .string()
  .min(1)
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"), {
    message: "Must be an absolute URL or a site-relative path"
  });

export function ok<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: message, details }, { status });
}

export function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json<ApiErrorBody>(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** Prisma's known request errors carry a string `code` (P2002, ...) and `meta`. */
function prismaError(error: unknown): { code: string; meta?: unknown } | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return { code: error.code, meta: "meta" in error ? error.meta : undefined };
  }
  return null;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }

  const prisma = prismaError(error);
  if (prisma?.code === "P2002") {
    return fail("A record with this unique value already exists", 409, prisma.meta);
  }

  if (prisma?.code === "P2025") {
    return fail("Record not found", 404);
  }

  if (prisma?.code === "P2003") {
    return fail("This action is blocked by a related record", 409, prisma.meta);
  }

  console.error(error);
  return fail("Internal server error", 500);
}

export function moneyToCents(value: unknown): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.round(numberValue * 100);
}

export function serializeMoney(cents: number, currency = "INR"): Money {
  return {
    cents,
    currency,
    formatted: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(cents / 100)
  };
}
