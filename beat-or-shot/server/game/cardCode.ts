import crypto from 'node:crypto';

/** Códigos de carta: HMAC del número de serie. Opacos, no contienen respuestas. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function cardCode(secret: string, edition: string, serial: number): string {
  const h = crypto.createHmac('sha256', secret).update(`${edition}:${serial}`).digest();
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[h[i] % 32];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
