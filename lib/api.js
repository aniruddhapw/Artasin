import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

export const mediaUrlSchema = z
  .string()
  .min(1)
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"), {
    message: "Must be an absolute URL or a site-relative path"
  });

export function ok(data, init = {}) {
  return NextResponse.json(data, init);
}

export function created(data) {
  return ok(data, { status: 201 });
}

export function fail(message, status = 400, details) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleApiError(error) {
  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }

  if (error?.code === "P2002") {
    return fail("A record with this unique value already exists", 409, error.meta);
  }

  if (error?.code === "P2025") {
    return fail("Record not found", 404);
  }

  if (error?.code === "P2003") {
    return fail("This action is blocked by a related record", 409, error.meta);
  }

  console.error(error);
  return fail("Internal server error", 500);
}

export function moneyToCents(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.round(numberValue * 100);
}

export function serializeMoney(cents, currency = "INR") {
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
