import type { ShippingAddress } from "@/types/orders";

const FIELDS = ["fullName", "email", "addressLine1", "addressLine2", "city", "state", "postalCode", "country"] as const;

/** Reads the JSON column safely: only known fields, and only strings. */
export function parseShippingAddress(value: unknown): ShippingAddress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const source = value as Record<string, unknown>;
  const address: ShippingAddress = {};
  for (const field of FIELDS) {
    const fieldValue = source[field];
    if (typeof fieldValue === "string") {
      address[field] = fieldValue;
    }
  }
  return address;
}
