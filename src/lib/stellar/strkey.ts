// Stellar public key ("G…") validation without the Stellar SDK, so forms and
// schemas can check addresses without pulling the SDK into every bundle.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PUBLIC_KEY_VERSION = 6 << 3; // encodes as a leading "G"

function base32Decode(input: string): Uint8Array | null {
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of input) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** CRC16-XModem, as used by Stellar's StrKey encoding. */
function crc16(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * True for a well-formed Stellar account address: right length, alphabet,
 * version byte and checksum. It does not check that the account exists.
 */
export function isValidPublicKey(address: string): boolean {
  if (!/^G[A-Z2-7]{55}$/.test(address)) return false;
  const decoded = base32Decode(address);
  if (!decoded || decoded.length !== 35) return false;
  if (decoded[0] !== PUBLIC_KEY_VERSION) return false;

  const checksum = decoded[33] | (decoded[34] << 8);
  return crc16(decoded.subarray(0, 33)) === checksum;
}
