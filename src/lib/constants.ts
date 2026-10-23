export const CYCLES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export const MODES = [
  { value: "portal", label: "Upload in portal" },
  { value: "hard_copy", label: "Hard copy" },
  { value: "email_einvoice", label: "Email E-Invoice" },
] as const;

export const CREDIT_LIMITS = [
  { value: "$1000", label: "$1000" },
  { value: "$5000", label: "$5000" },
  { value: "$10000", label: "$10000" },
  { value: "$25000", label: "$25000" },
  { value: "$50000", label: "$50000" },
  { value: "Unlimited", label: "Unlimited" },
] as const;

export const cycleLabel = (v: string) => CYCLES.find((c) => c.value === v)?.label ?? v;
export const modeLabel = (v: string) => MODES.find((c) => c.value === v)?.label ?? v;
