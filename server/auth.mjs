// Password hashing and bearer sessions for the local prototype. A production build should use an
// established identity provider (see docs/MOBILE_AND_SAFETY.md) instead of this module.
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function checkPassword(password, stored) {
  const [, salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Only a hash of each token is stored, so a copied data file cannot be replayed as a session.
export const newToken = () => randomBytes(32).toString('base64url');
export const tokenKey = token => createHash('sha256').update(String(token)).digest('hex');
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
