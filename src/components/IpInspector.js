import { useMemo, useRef, useState } from 'react';
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

// Design agent: Defines the chromatic palette used for network and host highlights.
const INSPECTOR_COLORS = {
  network: '#4F46E5',
  host: '#F97316',
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

// Design agent: Builds a colour-aware description for each octet of an address.
const buildColorisedOctets = (address, prefix, colors) => {
  const octets = address.split('.');
  const fullNetworkOctets = Math.floor(prefix / 8);
  const partialBits = prefix % 8;
  const gradientStop = partialBits === 0 ? 0 : (partialBits / 8) * 100;

  return octets.flatMap((octet, index) => {
    const segments = [];
    if (index < fullNetworkOctets) {
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: { color: colors.network },
        role: 'network',
      });
    } else if (index === fullNetworkOctets && partialBits > 0) {
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: {
          backgroundImage: `linear-gradient(90deg, ${colors.network} ${gradientStop}%, ${colors.host} ${gradientStop}%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        },
        role: 'mixed',
      });
    } else {
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: { color: colors.host },
        role: 'host',
      });
    }

    if (index < octets.length - 1) {
      segments.push({
        key: `dot-${index}`,
        value: '.',
        style: { color: 'inherit' },
        role: 'separator',
      });
    }
    return segments;
  });
};

// Design agent: Produces colour details for the boundary octet when it is split by the mask.
const buildBoundaryBinary = (address, prefix, colors) => {
  const partialBits = prefix % 8;
  if (partialBits === 0) {
    return null;
  }
  const boundaryOctetIndex = Math.floor(prefix / 8);
  const octetValue = Number(address.split('.')[boundaryOctetIndex]);
  const binary = octetValue.toString(2).padStart(8, '0');
  return {
    networkBits: binary.slice(0, partialBits),
    hostBits: binary.slice(partialBits),
    colors,
    octetIndex: boundaryOctetIndex,
    hostBitCount: 8 - partialBits,
    networkBitCount: partialBits,
  };
};

// Design agent: Extracts the host portion label for an address relative to the network prefix.
const getHostPortionLabel = (addressInt, baseNetwork, prefix) => {
  const hostBits = 32 - prefix;
  if (hostBits <= 0) {
    return '0';
  }
  const offset = addressInt - baseNetwork;
  const hostOctets = intToIpv4(offset).split('.');
  const hostStart = Math.floor(prefix / 8);
  const portion = hostOctets.slice(hostStart).join('.');
  return portion === '' ? '0' : portion;
};

// Design agent: Component exposing IPv4 insights and the interactive progress visualisation.
function IpInspector() {
  const [input, setInput] = useState('');
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  // Design agent: Stores live tooltip metadata for the progress bar.
  const [tooltipState, setTooltipState] = useState({
    isVisible: false,
    x: 0,
    y: 0,
    label: '',
    side: 'before',
  });
  // Design agent: References the progress track for tooltip alignment.
  const progressTrackRef = useRef(null);

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
    const clampedIp = Math.min(Math.max(ipInt, parsed.network), parsed.broadcast);
    const hostSpan = parsed.broadcast - parsed.network;
    const rawProgress = hostSpan === 0 ? 1 : (clampedIp - parsed.network) / hostSpan;
    const progressRatio = Math.max(0, Math.min(rawProgress, 1));
    const progress = progressRatio * 100;
    const hostRangeStart = parsed.prefix >= 31 ? parsed.network : parsed.network + 1;
    const hostRangeEnd = parsed.prefix >= 31 ? parsed.broadcast : parsed.broadcast - 1;
    const freeSegments = computeFreeSegments(ipInt, hostRangeStart, hostRangeEnd);

    const colorisedIp = buildColorisedOctets(parsed.ip, parsed.prefix, INSPECTOR_COLORS);
    const boundaryBinary = buildBoundaryBinary(parsed.ip, parsed.prefix, INSPECTOR_COLORS);
    const hostPortionNetwork = getHostPortionLabel(parsed.network, parsed.network, parsed.prefix);
    const hostPortionBroadcast = getHostPortionLabel(parsed.broadcast, parsed.network, parsed.prefix);
    const totalHosts = totalAddresses;

    return {
      parsed,
      prefix: parsed.prefix,
      mask,
      wildcard,
      type: getAddressType(ipInt),
      ipClass: getIpv4Class(parsed.ip),
      progress,
      progressRatio,
      networkAddress: intToIpv4(parsed.network),
      broadcastAddress: intToIpv4(parsed.broadcast),
      currentOctet: parsed.ip.split('.').pop(),
      leftUsable: freeSegments.left,
      rightUsable: freeSegments.right,
      inspectedIp: parsed.ip,
      totalHosts,
      colorisedIp,
      boundaryBinary,
      hostPortionNetwork,
      hostPortionBroadcast,
      colors: INSPECTOR_COLORS,
    };
  }, [input]);

  // Design agent: Handles changes within the IPv4/CIDR input control.
  const handleChange = (event) => {
    setInput(event.target.value);
  };

  // Design agent: Shows tooltips when the progress bar is hovered.
  const handleProgressEnter = () => {
    setIsProgressHovered(true);
    setTooltipState((prev) => ({
      ...prev,
      isVisible: true,
    }));
  };

  // Design agent: Hides tooltips when the pointer leaves the progress bar.
  const handleProgressLeave = () => {
    setIsProgressHovered(false);
    setTooltipState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  };

  // Design agent: Positions a dynamic tooltip relative to the pointer.
  const handleProgressMove = (event) => {
    if (!progressTrackRef.current || !analysis.parsed) {
      return;
    }
    const rect = progressTrackRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    const ratio = rect.width === 0 ? 0 : Math.max(0, Math.min(relativeX / rect.width, 1));
    const side = ratio <= analysis.progressRatio ? 'before' : 'after';
    const label =
      side === 'before'
        ? `Number of hosts before: ${analysis.leftUsable.toLocaleString()}`
        : `Number of hosts after: ${analysis.rightUsable.toLocaleString()}`;

    setTooltipState({
      isVisible: true,
      x: relativeX,
      y: relativeY,
      label,
      side,
    });
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
            <div className="cidr-display" aria-label="Inspected address">
              <span className="cidr-prefix">Inspecting</span>
              <span className="cidr-octets">
                {analysis.colorisedIp.map((segment) => (
                  <span key={segment.key} className="cidr-segment" style={segment.style}>
                    {segment.value}
                  </span>
                ))}
              </span>
              <span className="cidr-separator">/</span>
              <span className="cidr-segment" style={{ color: analysis.colors.network }}>{analysis.prefix}</span>
            </div>

            <div className="progress-wrapper">
              <div
                ref={progressTrackRef}
                className="progress-track"
                onMouseEnter={handleProgressEnter}
                onMouseLeave={handleProgressLeave}
                onMouseMove={handleProgressMove}
              >
                <div className="progress-gradient" style={{ width: `${analysis.progress}%` }} />
                <div
                  className={`progress-indicator ${isProgressHovered ? 'is-hovered' : ''}`}
                  style={{ left: `${analysis.progress}%` }}
                >
                  <span>{analysis.currentOctet}</span>
                </div>
              </div>
              {tooltipState.isVisible && (
                <div
                  className={`progress-hover-tooltip progress-hover-tooltip--${tooltipState.side}`}
                  style={{
                    left: `${tooltipState.x}px`,
                    top: `${tooltipState.y}px`,
                  }}
                >
                  {tooltipState.label}
                </div>
              )}
              <div className="progress-extents">
                <span className="endpoint">Net: {analysis.hostPortionNetwork}</span>
                <span className="endpoint endpoint--right">Brd: {analysis.hostPortionBroadcast}</span>
              </div>
            </div>

            <div className="insight-grid">
              {analysis.boundaryBinary && (
                <div className="boundary-panel">
                  <p className="insight-title">
                    {`Boundary octet ${analysis.boundaryBinary.octetIndex + 1}`}
                  </p>
                  <p className="binary-octet">
                    <span style={{ color: analysis.colors.network }}>{analysis.boundaryBinary.networkBits}</span>
                    <span style={{ color: analysis.colors.host }}>{analysis.boundaryBinary.hostBits}</span>
                  </p>
                  <div className="boundary-guide" aria-hidden="true">
                    <span className="boundary-count" style={{ color: analysis.colors.network }}>
                      {analysis.boundaryBinary.networkBitCount}
                    </span>
                    <span className="boundary-pointer" />
                  </div>
                </div>
              )}
              <div>
                <p className="insight-title">Total hosts</p>
                <p>{analysis.totalHosts.toLocaleString()}</p>
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

