// University email pattern: ^\d{4}[a-zA-Z]+\d{1,3}@uni\.edu\.pk$
const EMAIL_REGEX = /^(\d{4})([a-zA-Z]+)(\d{1,3})@uni\.edu\.pk$/;

export interface EmailParsedData {
  session: string;
  department: string;
  rollNumber: string;
}

export function validateUniversityEmail(email: string): { valid: boolean; data?: EmailParsedData; error?: string } {
  const match = email.trim().toLowerCase().match(EMAIL_REGEX);
  if (!match) {
    return { valid: false, error: 'Invalid university email format. Expected: 2023ce45@uni.edu.pk' };
  }
  return {
    valid: true,
    data: {
      session: match[1],       // "2023"
      department: match[2],    // "ce"
      rollNumber: match[3],    // "45"
    }
  };
}

/**
 * Normalize a roll number for consistent storage and comparison.
 * Pipeline: trim whitespace → remove non-numeric prefixes → parseInt to strip leading zeros
 */
export function normalizeRollNumber(raw: string): { normalized: string; display: string; changed: boolean } {
  const original = raw.trim();
  const display = original;

  // Remove non-numeric prefixes (e.g., "CE-045" → "045")
  const numericOnly = original.replace(/^[^0-9]*/, '');
  // parseInt strips leading zeros
  const parsed = parseInt(numericOnly, 10);
  const normalized = isNaN(parsed) ? original : String(parsed);

  return {
    normalized,
    display,
    changed: original !== normalized
  };
}

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random 8-character invite code
 */
export function generateInviteCode(dept: string, session: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,O,1,I to avoid confusion
  let code = dept.toUpperCase() + session.slice(2);
  while (code.length < 8) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 8);
}
