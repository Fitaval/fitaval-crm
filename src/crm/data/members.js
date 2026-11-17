/**
 * ==============================================================================
 * Fitaval CRM — Members UI Constants
 * ==============================================================================
 */

export const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring" },
  { key: "inactive", label: "Inactive" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const MEMBERSHIP_STATUSES = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "inactive", label: "Inactive" },
];

export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

export const MEMBER_PAYMENT_METHODS = [
  { value: "upi", label: "UPI (GPay / PhonePe)" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];
