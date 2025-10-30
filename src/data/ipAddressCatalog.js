// Design agent: Converts four IPv4 octets into an unsigned 32-bit integer.
const toInt = (a, b, c, d) =>
  ((((a << 24) >>> 0) | ((b << 16) >>> 0) | ((c << 8) >>> 0) | d) >>> 0);

// Design agent: Immutable catalogue describing notable IPv4 address ranges.
export const IPV4_ADDRESS_DATABASE = Object.freeze([
  {
    id: 'private-a',
    start: toInt(10, 0, 0, 0),
    end: toInt(10, 255, 255, 255),
    label: 'Private (RFC1918)',
    category: 'private',
  },
  {
    id: 'private-b',
    start: toInt(172, 16, 0, 0),
    end: toInt(172, 31, 255, 255),
    label: 'Private (RFC1918)',
    category: 'private',
  },
  {
    id: 'private-c',
    start: toInt(192, 168, 0, 0),
    end: toInt(192, 168, 255, 255),
    label: 'Private (RFC1918)',
    category: 'private',
  },
  {
    id: 'cgnat',
    start: toInt(100, 64, 0, 0),
    end: toInt(100, 127, 255, 255),
    label: 'Carrier-Grade NAT (RFC6598)',
    category: 'special-use',
  },
  {
    id: 'doc-net-1',
    start: toInt(192, 0, 2, 0),
    end: toInt(192, 0, 2, 255),
    label: 'Documentation (TEST-NET-1)',
    category: 'documentation',
  },
  {
    id: 'doc-net-2',
    start: toInt(198, 51, 100, 0),
    end: toInt(198, 51, 100, 255),
    label: 'Documentation (TEST-NET-2)',
    category: 'documentation',
  },
  {
    id: 'doc-net-3',
    start: toInt(203, 0, 113, 0),
    end: toInt(203, 0, 113, 255),
    label: 'Documentation (TEST-NET-3)',
    category: 'documentation',
  },
  {
    id: 'loopback',
    start: toInt(127, 0, 0, 0),
    end: toInt(127, 255, 255, 255),
    label: 'Loopback',
    category: 'loopback',
  },
  {
    id: 'link-local',
    start: toInt(169, 254, 0, 0),
    end: toInt(169, 254, 255, 255),
    label: 'Link-Local (APIPA)',
    category: 'link-local',
  },
  {
    id: 'multicast-local-control',
    start: toInt(224, 0, 0, 0),
    end: toInt(224, 0, 0, 255),
    label: 'Multicast',
    category: 'multicast',
    service: 'Local network control block (RFC 5771)',
  },
  {
    id: 'multicast-internet-control',
    start: toInt(224, 0, 1, 0),
    end: toInt(224, 0, 1, 255),
    label: 'Multicast',
    category: 'multicast',
    service: 'Internetwork control block (RFC 5771)',
  },
  {
    id: 'multicast-all-systems',
    start: toInt(224, 0, 0, 1),
    end: toInt(224, 0, 0, 1),
    label: 'Multicast',
    category: 'multicast',
    service: 'All systems on this subnet',
  },
  {
    id: 'multicast-all-routers',
    start: toInt(224, 0, 0, 2),
    end: toInt(224, 0, 0, 2),
    label: 'Multicast',
    category: 'multicast',
    service: 'All routers on this subnet',
  },
  {
    id: 'multicast-ospf-routers',
    start: toInt(224, 0, 0, 5),
    end: toInt(224, 0, 0, 6),
    label: 'Multicast',
    category: 'multicast',
    service: 'OSPF designated routers',
  },
  {
    id: 'multicast-ripv2',
    start: toInt(224, 0, 0, 9),
    end: toInt(224, 0, 0, 9),
    label: 'Multicast',
    category: 'multicast',
    service: 'RIPv2 routers',
  },
  {
    id: 'multicast-eigrp',
    start: toInt(224, 0, 0, 10),
    end: toInt(224, 0, 0, 10),
    label: 'Multicast',
    category: 'multicast',
    service: 'EIGRP routers',
  },
  {
    id: 'multicast-mdns',
    start: toInt(224, 0, 0, 251),
    end: toInt(224, 0, 0, 251),
    label: 'Multicast',
    category: 'multicast',
    service: 'Multicast DNS (mDNS)',
  },
  {
    id: 'multicast-dns-sd',
    start: toInt(224, 0, 0, 252),
    end: toInt(224, 0, 0, 252),
    label: 'Multicast',
    category: 'multicast',
    service: 'DNS Service Discovery',
  },
  {
    id: 'multicast-global',
    start: toInt(224, 1, 0, 0),
    end: toInt(238, 255, 255, 255),
    label: 'Multicast',
    category: 'multicast',
    service: 'Globally scoped multicast range',
  },
  {
    id: 'multicast-administratively-scoped',
    start: toInt(239, 0, 0, 0),
    end: toInt(239, 255, 255, 255),
    label: 'Multicast',
    category: 'multicast',
    service: 'Administratively scoped multicast',
  },
  {
    id: 'reserved',
    start: toInt(240, 0, 0, 0),
    end: toInt(255, 255, 255, 254),
    label: 'Reserved',
    category: 'reserved',
  },
  {
    id: 'limited-broadcast',
    start: toInt(255, 255, 255, 255),
    end: toInt(255, 255, 255, 255),
    label: 'Broadcast',
    category: 'broadcast',
  },
]);

// Design agent: Retrieves metadata for a given IPv4 integer from the catalogue.
export const findIpv4Metadata = (ipInt) => {
  if (typeof ipInt !== 'number' || Number.isNaN(ipInt)) {
    return { label: 'Public', category: 'public' };
  }
  for (let index = 0; index < IPV4_ADDRESS_DATABASE.length; index += 1) {
    const entry = IPV4_ADDRESS_DATABASE[index];
    if (ipInt >= entry.start && ipInt <= entry.end) {
      return entry;
    }
  }
  return { label: 'Public', category: 'public' };
};

