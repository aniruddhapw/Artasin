/**
 * The shipping address a buyer types at checkout, stored as JSON on Order.
 * Every field is optional: the column is unvalidated JSON, and older orders
 * may lack fields. Read it with parseShippingAddress (lib/shippingAddress.ts).
 */
export interface ShippingAddress {
  fullName?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
