// Password hashing and bearer sessions for the local prototype. A production build should use an
// established identity provider (see docs/MOBILE_AND_SAFETY.md) instead of this module.
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

// scrypt at OWASP's recommended cost (N=2^17, r=8, p=1: about 128 MB and a few hundred ms), run off the main
// thread. The cost is stored in the hash, so it can rise later; hashes from before (plain "scrypt:", Node's
// default N=2^14) still verify, and needsRehash() lets a login upgrade them.
// Under `node --test` a cheap cost keeps the suite fast; the format and upgrade path are the same.
const COST = { N: process.env.NODE_TEST_CONTEXT ? 2 ** 10 : 2 ** 17, r: 8, p: 1 };
const run = (password, salt, length, { N, r, p }) => new Promise((resolve, reject) => scrypt(password, salt, length, { N, r, p, maxmem: 256 * 2 ** 20 }, (error, key) => (error ? reject(error) : resolve(key))));

export async function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt2:${COST.N}:${COST.r}:${COST.p}:${salt.toString('hex')}:${(await run(password, salt, 64, COST)).toString('hex')}`;
}

export async function checkPassword(password, stored) {
  const parts = String(stored).split(':');
  const [cost, salt, hash] = parts[0] === 'scrypt2' ? [{ N: +parts[1], r: +parts[2], p: +parts[3] }, parts[4], parts[5]] : [{ N: 2 ** 14, r: 8, p: 1 }, parts[1], parts[2]];
  if (!salt || !hash || !(cost.N > 1)) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await run(String(password), Buffer.from(salt, 'hex'), expected.length, cost);
  return timingSafeEqual(actual, expected);
}

export const needsRehash = stored => !String(stored).startsWith(`scrypt2:${COST.N}:${COST.r}:${COST.p}:`);

// Only a hash of each token is stored, so a copied data file cannot be replayed as a session.
export const newToken = () => randomBytes(32).toString('base64url');
export const tokenKey = token => createHash('sha256').update(String(token)).digest('hex');
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
