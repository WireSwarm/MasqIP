import { findIpv4Metadata } from '../data/ipAddressCatalog';

// Design agent: Provides IPv4 parsing, formatting, and computation helpers used across calculators.
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

// Design agent: Converts dotted decimal IPv4 string to a 32-bit number.
export function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return (
    (parts[0] << 24) |
    (parts[1] << 16) |
    (parts[2] << 8) |
    parts[3]
  ) >>> 0;
}

// Design agent: Converts 32-bit number back to dotted decimal IPv4 string.
export function intToIpv4(intValue) {
  return [
    (intValue >>> 24) & 0xff,
    (intValue >>> 16) & 0xff,
    (intValue >>> 8) & 0xff,
    intValue & 0xff,
  ].join('.');
}

// Design agent: Parses a CIDR string like 192.168.0.0/24 into structured data.
export function parseCidr(input) {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  const [ipPart, prefixPart] = trimmed.split('/');
  if (!IPV4_REGEX.test(ipPart)) {
    return null;
  }
  const prefix = Number(prefixPart);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }
  const baseIp = ipv4ToInt(ipPart);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = baseIp & mask;
  const broadcast = network | (~mask >>> 0);
  return {
    ip: ipPart,
    prefix,
    mask,
    network,
    broadcast,
  };
}

// Design agent: Formats a mask integer into dotted decimal notation.
export function formatMask(maskInt) {
  return intToIpv4(maskInt >>> 0);
}

// Design agent: Produces wildcard mask (inverse of netmask).
export function formatWildcard(maskInt) {
  const wildcard = (~maskInt) >>> 0;
  return formatMask(wildcard);
}

// Design agent: Determines the IPv4 class based on the first octet.
export function getIpv4Class(ip) {
  const parts = ip.split('.').map(Number);
  const first = parts[0];
  if (first <= 127) return 'Class A';
  if (first <= 191) return 'Class B';
  if (first <= 223) return 'Class C';
  if (first <= 239) return 'Class D (Multicast)';
  return 'Class E (Experimental)';
}

// Design agent: Finds the smallest common prefix that covers two integer IPs.
export function commonPrefixLength(a, b) {
  let xor = (a ^ b) >>> 0;
  let prefix = 32;
  while (xor > 0) {
    xor >>>= 1;
    prefix -= 1;
  }
  return prefix;
}

// Design agent: Aligns an IP integer to the next multiple of a block size within a base network.
export function alignToBlock(address, blockSize, baseNetwork) {
  const offset = address - baseNetwork;
  const alignedOffset = Math.ceil(offset / blockSize) * blockSize;
  return baseNetwork + alignedOffset;
}

// Design agent: Checks if string looks like IPv4 subnet (CIDR).
export function isValidCidr(input) {
  return Boolean(parseCidr(input));
}

// Design agent: Retrieves structured metadata for an IPv4 integer.
export function getAddressMetadata(ipInt) {
  return findIpv4Metadata(ipInt);
}

// Design agent: Preserves backward compatibility by exposing only the label.
export function getAddressType(ipInt) {
  const metadata = getAddressMetadata(ipInt);
  return metadata.label;
}

// Design agent: Calculates the usable host count for a prefix, handling edge cases like /31 and /32.
export function getUsableHostCount(prefix) {
  if (prefix === 31) return 2;
  if (prefix === 32) return 1;
  const hostBits = 32 - prefix;
  return Math.max(0, 2 ** hostBits - 2);
}

// Design agent: Calculates total address count for a prefix.
export function getTotalAddressCount(prefix) {
  const hostBits = 32 - prefix;
  return 2 ** hostBits;
}
