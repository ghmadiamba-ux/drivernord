// Data quality detection for ingested driver records.
// Pure functions — no DB access. All detection is local to the input values.

export type DataQualityIssueType =
  | 'name_is_phone_number'
  | 'email_is_phone_number'
  | 'name_missing_or_unusable';

export interface DataQualityIssue {
  type: DataQualityIssueType;
  field: 'first_name' | 'email';
  value: string;
}

export interface DataQualityResult {
  issues: DataQualityIssue[];
  clean: boolean;
}

// Returns true if the string looks like a Swedish or international phone number.
// Matches: 07xxxxxxxx, +467xxxxxxxx, 08xxxxxxxx, and generic digit sequences.
export function looksLikePhoneNumber(value: string): boolean {
  const stripped = value.replace(/[\s\-().]/g, '');
  // International format (+46...) or Swedish local (0...) with sufficient digits
  if (/^\+\d{7,14}$/.test(stripped)) return true;
  if (/^0\d{7,12}$/.test(stripped)) return true;
  // Pure digit string that is long enough to be a phone number
  if (/^\d{8,15}$/.test(stripped)) return true;
  return false;
}

export function detectDataQualityIssues(params: {
  firstName: string;
  phone: string;
  email: string | null;
}): DataQualityResult {
  const { firstName, phone, email } = params;
  const issues: DataQualityIssue[] = [];

  const trimmedName = firstName.trim();
  const trimmedPhone = phone.trim();

  // Name is the phone number (exact match after trim, or looks like a phone)
  if (trimmedName === trimmedPhone || looksLikePhoneNumber(trimmedName)) {
    issues.push({ type: 'name_is_phone_number', field: 'first_name', value: trimmedName });
  } else {
    // Name has no recognisable letters — useless for greeting
    const hasLetter = /[a-zA-ZåäöÅÄÖæøÆØéèüú]/.test(trimmedName);
    if (!hasLetter || trimmedName.length < 2) {
      issues.push({ type: 'name_missing_or_unusable', field: 'first_name', value: trimmedName });
    }
  }

  // Email is the phone number
  if (email !== null) {
    const trimmedEmail = email.trim();
    if (trimmedEmail === trimmedPhone || looksLikePhoneNumber(trimmedEmail)) {
      issues.push({ type: 'email_is_phone_number', field: 'email', value: trimmedEmail });
    }
  }

  return { issues, clean: issues.length === 0 };
}
