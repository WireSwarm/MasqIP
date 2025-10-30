import { useMemo, useState } from 'react';
import {
  formatMask,
  formatWildcard,
  getAddressType,
  getIpv4Class,
  getTotalAddressCount,
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

// Design agent: Component exposing IPv4 insights and the interactive progress visualisation.
function IpInspector() {
  const [input, setInput] = useState('');
  const [isProgressHovered, setIsProgressHovered] = useState(false);

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
    const mask = formatMask(parsed.mask);
    const wildcard = formatWildcard(parsed.mask);
    const ipPosition = Math.min(Math.max(ipInt, parsed.network), parsed.broadcast);
    const progress =
      totalAddresses > 1 ? ((ipPosition - parsed.network) / (totalAddresses - 1)) * 100 : 100;
    const hostRangeStart = parsed.prefix >= 31 ? parsed.network : parsed.network + 1;
    const hostRangeEnd = parsed.prefix >= 31 ? parsed.broadcast : parsed.broadcast - 1;
    const freeSegments = computeFreeSegments(ipInt, hostRangeStart, hostRangeEnd);

    return {
      parsed,
      prefix: parsed.prefix,
      mask,
      wildcard,
      type: getAddressType(ipInt),
      ipClass: getIpv4Class(parsed.ip),
      progress: Math.max(0, Math.min(progress, 100)),
      networkAddress: intToIpv4(parsed.network),
      broadcastAddress: intToIpv4(parsed.broadcast),
      networkEndpoint: formatCompactOctetLabel(parsed.ip, intToIpv4(parsed.network)),
      broadcastEndpoint: formatCompactOctetLabel(parsed.ip, intToIpv4(parsed.broadcast)),
      currentOctet: parsed.ip.split('.').pop(),
      leftUsable: freeSegments.left,
      rightUsable: freeSegments.right,
      inspectedIp: parsed.ip,
    };
  }, [input]);

  // Design agent: Handles changes within the IPv4/CIDR input control.
  const handleChange = (event) => {
    setInput(event.target.value);
  };

  // Design agent: Shows tooltips when the progress bar is hovered.
  const handleProgressEnter = () => {
    setIsProgressHovered(true);
  };

  // Design agent: Hides tooltips when the pointer leaves the progress bar.
  const handleProgressLeave = () => {
    setIsProgressHovered(false);
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
            <p className="result-summary">Inspecting {analysis.inspectedIp}/{analysis.prefix}</p>

            <div className="progress-wrapper">
              <div
                className="progress-track"
                onMouseEnter={handleProgressEnter}
                onMouseLeave={handleProgressLeave}
              >
                <div
                  className="progress-gradient"
                  style={{ width: `${analysis.progress}%` }}
                />
                <div
                  className={`progress-indicator ${isProgressHovered ? 'is-hovered' : ''}`}
                  style={{ left: `${analysis.progress}%` }}
                >
                  {isProgressHovered && (
                    <>
                      <span className="progress-tooltip tooltip-left">
                        {analysis.leftUsable.toLocaleString()} to network
                      </span>
                      <span className="progress-tooltip tooltip-right">
                        {analysis.rightUsable.toLocaleString()} to broadcast
                      </span>
                    </>
                  )}
                  <span>{analysis.currentOctet}</span>
                </div>
              </div>
              <div className="progress-extents">
                <span>{analysis.networkEndpoint}</span>
                <span>{analysis.broadcastEndpoint}</span>
              </div>
            </div>

            <div className="insight-grid">
              <div>
                <p className="insight-title">Network</p>
                <p>{analysis.networkAddress}/{analysis.prefix}</p>
              </div>
              <div>
                <p className="insight-title">Broadcast</p>
                <p>{analysis.broadcastAddress}</p>
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

