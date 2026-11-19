export interface PhoneCode {
  code: string;
  dialCode: string;
  name: string;
}

export const countries: PhoneCode[] = [
  { code: "LK", dialCode: "+94", name: "Sri Lanka" },
  { code: "VN", dialCode: "+84", name: "Vietnam" },
  { code: "KH", dialCode: "+855", name: "Cambodia" },
  { code: "BD", dialCode: "+880", name: "Bangladesh" },
  { code: "IN", dialCode: "+91", name: "India" },
  { code: "NL", dialCode: "+31", name: "Netherlands" },
];

export const getFlagUrl = (countryCode: string): string =>
  `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;

/* ------------------------------------------------------------------ */
/* PHONE VALIDATION (per country)                                      */
/* Numbers are entered WITHOUT the country code and WITHOUT leading 0  */
/* ------------------------------------------------------------------ */
export interface PhoneRule {
  regex: RegExp;
  maxLength: number;
  error: string;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  // Sri Lanka – 9 digits, starts with 7 (e.g. 712345678)
  "+94": {
    regex: /^7\d{8}$/,
    maxLength: 9,
    error: "Sri Lanka number must be 9 digits and start with 7",
  },
  // Vietnam – 9 digits, starts with 3, 5, 7, 8 or 9
  "+84": {
    regex: /^[35789]\d{8}$/,
    maxLength: 9,
    error: "Vietnam number must be 9 digits and start with 3, 5, 7, 8 or 9",
  },
  // Cambodia – exactly 8 digits, valid mobile prefix
  "+855": {
    regex:
      /^(10|11|12|14|15|16|17|61|66|67|68|69|70|76|77|78|79|81|85|86|87|88|89|90|92|93|95|96|97|98|99)\d{6}$/,
    maxLength: 8,
    error:
      "Cambodia number must be 8 digits with a valid prefix (e.g. 12345678)",
  },
  // Bangladesh – 10 digits, starts with 13–19
  "+880": {
    regex: /^1[3-9]\d{8}$/,
    maxLength: 10,
    error: "Bangladesh number must be 10 digits and start with 13–19",
  },
  // India – 10 digits, starts with 6, 7, 8 or 9
  "+91": {
    regex: /^[6-9]\d{9}$/,
    maxLength: 10,
    error: "India number must be 10 digits and start with 6, 7, 8 or 9",
  },
  // Netherlands – 9 digits, starts with 6
  "+31": {
    regex: /^6\d{8}$/,
    maxLength: 9,
    error: "Netherlands number must be 9 digits and start with 6",
  },
};

export const getPhoneMaxLength = (dialCode: string): number =>
  PHONE_RULES[dialCode]?.maxLength ?? 10;

/** Strips non-digits and leading zeros, then trims to the country's max length */
export const cleanPhoneInput = (text: string, dialCode: string): string =>
  text
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "")
    .slice(0, getPhoneMaxLength(dialCode));

interface ValidatePhoneOptions {
  /** default true. When false, an empty number is considered valid */
  required?: boolean;
  /** message shown when the number is empty and required */
  emptyMessage?: string;
}

/** Returns "" when valid, otherwise an error message */
export const validatePhone = (
  dialCode: string,
  number: string,
  {
    required = true,
    emptyMessage = "Mobile number is required",
  }: ValidatePhoneOptions = {},
): string => {
  const n = number.trim().replace(/^0+/, "");
  if (!n) return required ? emptyMessage : "";
  const rule = PHONE_RULES[dialCode];
  if (!rule) return "Unsupported country code";
  return rule.regex.test(n) ? "" : rule.error;
};

/** true if `n` can still be completed into a valid number for this country */
export const isPhonePartialValid = (dialCode: string, n: string): boolean => {
  const rule = PHONE_RULES[dialCode];
  if (!rule) return true;
  if (n.length >= rule.maxLength) return rule.regex.test(n);
  const rest = rule.maxLength - n.length;
  for (let d = 0; d <= 9; d++) {
    if (rule.regex.test(n + String(d).repeat(rest))) return true;
  }
  return false;
};

/** Live check while typing: "" if empty / no code / still possibly valid */
export const liveValidatePhone = (dialCode: string, n: string): string => {
  if (!n || !dialCode) return "";
  if (isPhonePartialValid(dialCode, n)) return "";
  return PHONE_RULES[dialCode]?.error ?? "Invalid phone number";
};