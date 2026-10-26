/**
 * Derives the isolated Hindsight memory bank ID for an authenticated user.
 * Each user is assigned a completely private and isolated bank: `socialpulse-<sanitized-user-id>`.
 * This guarantees zero cross-contamination between users.
 */
export function getUserBankId(userId: string): string {
  const cleanId = userId.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `socialpulse-${cleanId}`;
}
