import { useMemo, useState } from 'react';
import {
  formatMask,
  formatWildcard,
  getAddressType,
  getIpv4Class,
  getTotalAddressCount,
  getUsableHostCount,
  intToIpv4,
  ipv4ToInt,
  parseCidr,
} from '../utils/ipMath';

// Design agent: Returns the octets that differ between two IPv4 addresses.
const getDifferingOctets = (a, b) => {
  const octetsA = a.split('.');
  const octetsB = b.split('.');
  return octetsA
    .map((value, index) => (value === octetsB[index] ? null : value))
    .filter((value) => value !== null);
};

// Design agent: Formats a friendly label showing only significant trailing octets.
const formatCompactOctetLabel = (base, target) => {
  const differing = getDifferingOctets(base, target);
  if (differing.length === 0) {
    return base.split('.').pop();
  }
  return differing.join('.');
};

// Design agent: Computes contiguous free ranges around the inspected IP.
const computeFreeSegments = (ipInt, usableStart, usableEnd) => {
  if (usableEnd < usableStart) {
    return { left: 0, right: 0 };
  }
  const clampedIp = Math.min(Math.max(ipInt, usableStart), usableEnd);
  return {
    left: Math.max(0, clampedIp - usableStart),
    right: Math.max(0, usableEnd - clampedIp),
  };
};

// Design agent: Component exposing IPv4 insights and progress visualisation.
function IpInspector() {
  const [input, setInput] = useState('');

  // Design agent: Derives interpreted metrics for the current input.
  const analysis = useMemo(() => {
    if (input.trim() === '') {
      return { prompt: 'Enter an IPv4 address with CIDR to begin.' };
    }

    const parsed = parseCidr(input);
    if (!parsed) {
      return { error: 'Invalid IPv4/CIDR notation. Try 192.168.1.10/24.' };
    }

    const ipInt = ipv4ToInt(parsed.ip);
    if (ipInt === null) {
      return { error: 'The IPv4 portion is not valid.' };
    }

    const totalAddresses = getTotalAddressCount(parsed.prefix);
    const usableHostCount = getUsableHostCount(parsed.prefix);
    const mask = formatMask(parsed.mask);
    const wildcard = formatWildcard(parsed.mask);
    const nextNetworkInt = parsed.broadcast + 1 <= 0xffffffff ? parsed.broadcast + 1 : null;
    const nextNetworkLabel = nextNetworkInt !== null ? `${intToIpv4(nextNetworkInt)}/${parsed.prefix}` : 'N/A';
    const ipPosition = Math.min(
      Math.max(ipInt, parsed.network),
      parsed.broadcast,
    );
    const progress = totalAddresses > 1 ? ((ipPosition - parsed.network) / (totalAddresses - 1)) * 100 : 100;
    const hostRangeStart = parsed.prefix >= 31 ? parsed.network : parsed.network + 1;
    const hostRangeEnd = parsed.prefix >= 31 ? parsed.broadcast : parsed.broadcast - 1;
    const freeSegments = computeFreeSegments(ipInt, hostRangeStart, hostRangeEnd);
    const largestRange = Math.max(freeSegments.left, freeSegments.right);
    const nonZeroSegments = [freeSegments.left, freeSegments.right].filter((value) => value > 0);
    const smallestRange = nonZeroSegments.length === 0 ? 0 : Math.min(...nonZeroSegments);

    return {
      parsed,
      ip: parsed.ip,
      prefix: parsed.prefix,
      mask,
      wildcard,
      type: getAddressType(ipInt),
      ipClass: getIpv4Class(parsed.ip),
      totalAddresses,
      usableHostCount,
      usedAddresses: parsed.prefix >= 31 ? totalAddresses : 1,
      largestRange,
      smallestRange,
      nextNetworkLabel,
      progress: Math.max(0, Math.min(progress, 100)),
      networkLabel: formatCompactOctetLabel(parsed.ip, intToIpv4(parsed.network)),
      ipLabel: formatCompactOctetLabel(parsed.ip, parsed.ip),
      broadcastLabel: formatCompactOctetLabel(parsed.ip, intToIpv4(parsed.broadcast)),
      networkAddress: intToIpv4(parsed.network),
      broadcastAddress: intToIpv4(parsed.broadcast),
    };
  }, [input]);

  // Design agent: Handles changes within the IPv4/CIDR input control.
  const handleChange = (event) => {
    setInput(event.target.value);
  };

  return (
    <div className="column-content">
      <label className="field">
        <span>IPv4 / CIDR</span>
        <input
          value={input}
          onChange={handleChange}
          placeholder="e.g. 10.0.0.125/24"
          className="field-input"
        />
      </label>

      <div className="result-card insight-card">
        {analysis.error && <p className="error-text">{analysis.error}</p>}
        {analysis.prompt && <p className="result-summary">{analysis.prompt}</p>}
        {analysis.parsed && (
          <>
            <div className="progress-wrapper">
              <div className="progress-track">
                <div
                  className="progress-gradient"
                  style={{ width: `${analysis.progress}%` }}
                />
                <div
                  className="progress-indicator"
                  style={{ left: `${analysis.progress}%` }}
                >
                  <span>{analysis.ipLabel}</span>
                </div>
              </div>
              <div className="progress-labels">
                <span>{analysis.networkLabel}</span>
                <span>{analysis.broadcastLabel}</span>
              </div>
            </div>

            <div className="insight-grid">
              <div>
                <p className="insight-title">Network</p>
                <p>{analysis.networkAddress}/{analysis.prefix}</p>
              </div>
              <div>
                <p className="insight-title">Mask</p>
                <p>{analysis.mask}</p>
              </div>
              <div>
                <p className="insight-title">Wildcard</p>
                <p>{analysis.wildcard}</p>
              </div>
              <div>
                <p className="insight-title">Next network</p>
                <p>{analysis.nextNetworkLabel}</p>
              </div>
              <div>
                <p className="insight-title">Total IPs</p>
                <p>{analysis.totalAddresses.toLocaleString()}</p>
              </div>
              <div>
                <p className="insight-title">Usable IPs</p>
                <p>{analysis.usableHostCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="insight-title">Used IPs</p>
                <p>{analysis.usedAddresses.toLocaleString()}</p>
              </div>
              <div>
                <p className="insight-title">Largest free range</p>
                <p>{analysis.largestRange.toLocaleString()}</p>
              </div>
              <div>
                <p className="insight-title">Smallest free range</p>
                <p>{analysis.smallestRange.toLocaleString()}</p>
              </div>
              <div>
                <p className="insight-title">Type</p>
                <p>{analysis.type}</p>
              </div>
              <div>
                <p className="insight-title">Class</p>
                <p>{analysis.ipClass}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default IpInspector;
