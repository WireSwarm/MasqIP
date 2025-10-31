import { useMemo, useRef, useState } from 'react';
import {
  formatMask,
  formatWildcard,
  getAddressMetadata,
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

// Design agent: Produces a horizontal gradient for an octet that mixes network and host colours.
const buildMixedOctetStyle = (networkBitCount, colors) => {
  const bitSlice = [];
  for (let index = 0; index < 8; index += 1) {
    bitSlice.push(index < networkBitCount ? colors.network : colors.host);
  }
  const firstColour = bitSlice[0];
  const isUniform = bitSlice.every((colour) => colour === firstColour);
  if (isUniform) {
    return { color: firstColour };
  }

  const stops = [];
  let segmentStart = 0;
  let currentColour = bitSlice[0];

  for (let index = 1; index < bitSlice.length; index += 1) {
    const colour = bitSlice[index];
    if (colour !== currentColour) {
      const startPercent = (segmentStart / bitSlice.length) * 100;
      const endPercent = (index / bitSlice.length) * 100;
      stops.push(`${currentColour} ${startPercent}%`, `${currentColour} ${endPercent}%`);
      segmentStart = index;
      currentColour = colour;
    }
  }

  const finalStart = (segmentStart / bitSlice.length) * 100;
  stops.push(`${currentColour} ${finalStart}%`, `${currentColour} 100%`);

  return {
    backgroundImage: `linear-gradient(90deg, ${stops.join(', ')})`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  };
};

// Design agent: Builds a colour-aware description for each octet of an address.
const buildColorisedOctets = (address, prefix, colors) => {
  const octets = address.split('.');
  const fullNetworkOctets = Math.floor(prefix / 8);
  const partialBits = prefix % 8;

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
        style: buildMixedOctetStyle(partialBits, colors),
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
  const wholePrefix = Math.floor(prefix / 8) * 8;
  const cidrEquation = `/${prefix} = ${wholePrefix} + ${partialBits}`;
  return {
    networkBits: binary.slice(0, partialBits),
    hostBits: binary.slice(partialBits),
    colors,
    octetIndex: boundaryOctetIndex,
    hostBitCount: 8 - partialBits,
    networkBitCount: partialBits,
    cidrEquation,
  };
};

// Design agent: Extracts the dotted suffix that represents the host side of an address.
const getHostPortionLabel = (addressInt, prefix) => {
  const octets = intToIpv4(addressInt).split('.');
  const hostBits = Math.max(0, 32 - prefix);
  if (hostBits <= 0) {
    return `.${octets[octets.length - 1]}`;
  }
  const suffixStart = Math.min(octets.length, Math.floor(prefix / 8));
  const suffixOctets = octets.slice(suffixStart);
  const suffix = suffixOctets.length === 0 ? octets[octets.length - 1] : suffixOctets.join('.');
  return `.${suffix}`;
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
    const metadata = getAddressMetadata(ipInt);
    const mask = formatMask(parsed.mask);
    const wildcard = formatWildcard(parsed.mask);
    const clampedIp = Math.min(Math.max(ipInt, parsed.network), parsed.broadcast);
    // Design agent: Extract host mask to isolate host bits for proportional placement.
    const hostMask = (~parsed.mask) >>> 0;
    const hostRangeStart = parsed.prefix >= 31 ? parsed.network : parsed.network + 1;
    const hostRangeEnd = parsed.prefix >= 31 ? parsed.broadcast : parsed.broadcast - 1;
    // Design agent: Count only usable hosts so the slider represents actual assignable endpoints.
    const usableHostCount = hostRangeEnd < hostRangeStart ? 0 : hostRangeEnd - hostRangeStart + 1;
    const clampedHostAddress =
      usableHostCount <= 0
        ? hostRangeStart
        : Math.min(Math.max(clampedIp, hostRangeStart), hostRangeEnd);
    const hostIndex = usableHostCount <= 0 ? 0 : clampedHostAddress - hostRangeStart;
    const hostProgressRatio = usableHostCount <= 1 ? 0 : hostIndex / (usableHostCount - 1);
    const hostProgressPercent = hostProgressRatio * 100;
    const totalRange = parsed.broadcast - parsed.network;
    // Design agent: Map usable host spans back onto the visual track to preserve network/broadcast context.
    const hostWindowStartRatio =
      totalRange === 0
        ? 0
        : Math.max(0, Math.min(1, (hostRangeStart - parsed.network) / totalRange));
    const hostWindowEndRatio =
      totalRange === 0
        ? 1
        : Math.max(0, Math.min(1, (hostRangeEnd - parsed.network) / totalRange));
    const hostWindowWidthRatio = Math.max(0, hostWindowEndRatio - hostWindowStartRatio);
    // Design agent: Preserve host-space placement for interaction feedback.
    const hostIndicatorRatio =
      hostWindowWidthRatio === 0
        ? hostWindowStartRatio
        : hostWindowStartRatio + hostProgressRatio * hostWindowWidthRatio;
    // Design agent: Position the indicator using only the host bits so equivalent host values align across networks.
    const hostSegment = clampedIp & hostMask;
    const networkTrackRatio = hostMask === 0 ? 0 : Math.max(0, Math.min(1, hostSegment / hostMask));
    // Design agent: Clamp proportional positioning to the track bounds to avoid overflow.
    const indicatorTrackPercent = Math.min(100, Math.max(0, networkTrackRatio * 100));
    const hostWindowStartPercent = hostWindowStartRatio * 100;
    const hostWindowWidthPercent = hostWindowWidthRatio * 100;
    const hostFillPercent =
      hostWindowWidthRatio === 0 ? 0 : hostWindowWidthPercent * hostProgressRatio;
    // Design agent: Split the track gradient so the left segment tracks the network portion.
    const trackGradient = `linear-gradient(90deg, ${INSPECTOR_COLORS.network} 0%, ${INSPECTOR_COLORS.network} ${indicatorTrackPercent}%, ${INSPECTOR_COLORS.host} ${indicatorTrackPercent}%, ${INSPECTOR_COLORS.host} 100%)`;
    const freeSegments = computeFreeSegments(ipInt, hostRangeStart, hostRangeEnd);
    const isNetworkAddress = ipInt === parsed.network;
    const isBroadcastAddress = ipInt === parsed.broadcast;
    const colorisedIp = buildColorisedOctets(parsed.ip, parsed.prefix, INSPECTOR_COLORS);
    const boundaryBinary = buildBoundaryBinary(parsed.ip, parsed.prefix, INSPECTOR_COLORS);
    const hostPortionNetwork = getHostPortionLabel(parsed.network, parsed.prefix);
    const hostPortionBroadcast = getHostPortionLabel(parsed.broadcast, parsed.prefix);
    const hostPortionCurrent = getHostPortionLabel(ipInt, parsed.prefix);
    const indicatorAccent = isNetworkAddress
      ? 'var(--layer-color-b)'
      : isBroadcastAddress
      ? 'var(--layer-color-c)'
      : INSPECTOR_COLORS.host;
    const hostBits = Math.max(0, 32 - parsed.prefix);
    // Design agent: Report the usable host count so UI metrics align with the progress bar.
    const totalHosts =
      parsed.prefix >= 31 ? totalAddresses : Math.max(0, totalAddresses - 2);
    const indicatorScale = Math.max(64, Math.min(240, 48 + hostBits * 12));
    const indicatorTextColor = isNetworkAddress
      ? 'var(--layer-color-b)'
      : isBroadcastAddress
      ? 'var(--layer-color-c)'
      : INSPECTOR_COLORS.host;

    return {
      parsed,
      prefix: parsed.prefix,
      mask,
      wildcard,
      type: metadata.label,
      addressMetadata: metadata,
      ipClass: getIpv4Class(parsed.ip),
      hostProgressPercent,
      hostProgressRatio,
      indicatorTrackPercent,
      indicatorTrackRatio: networkTrackRatio,
      hostIndicatorRatio,
      hostWindowStartPercent,
      hostWindowWidthPercent,
      hostFillPercent,
      trackGradient,
      usableHostCount,
      hostIndex,
      networkAddress: intToIpv4(parsed.network),
      broadcastAddress: intToIpv4(parsed.broadcast),
      leftUsable: freeSegments.left,
      rightUsable: freeSegments.right,
      inspectedIp: parsed.ip,
      totalHosts,
      colorisedIp,
      boundaryBinary,
      hostPortionNetwork,
      hostPortionBroadcast,
      hostPortionCurrent,
      isNetworkAddress,
      isBroadcastAddress,
      indicatorAccent,
      indicatorTextColor,
      indicatorScale,
      colors: INSPECTOR_COLORS,
      currentOctet: parsed.ip.split('.').pop(),
    };
  }, [input]);

  // Design agent: Lists insight labels for the legend displayed beneath the progress bar.
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
    const side = ratio <= analysis.hostIndicatorRatio ? 'before' : 'after';
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

  // Design agent: Drive the progress visuals directly from the computed host-based ratios.
  const activeIndicatorPercent = analysis.parsed ? analysis.indicatorTrackPercent : 0;
  const activeHostFillPercent = analysis.parsed ? analysis.hostFillPercent : 0;
  const hostWindowStartPercent = analysis.parsed ? analysis.hostWindowStartPercent : 0;
  const hostWindowWidthPercent = analysis.parsed ? analysis.hostWindowWidthPercent : 0;
  // Design agent: Inline gradient keeps the track colours aligned with the computed proportions.
  const progressTrackStyle = analysis.parsed ? { background: analysis.trackGradient } : undefined;
  // Design agent: Shift the indicator so edge cases snap cleanly to the track boundaries.
  const indicatorTransform =
    activeIndicatorPercent <= 0
      ? 'translate(0, -50%)'
      : activeIndicatorPercent >= 100
      ? 'translate(-100%, -50%)'
      : 'translate(-50%, -50%)';

  return (
    <div className="column-content" id="ipv4-insight-panel">
      <label className="field" htmlFor="ipv4-cidr-input" id="ipv4-insight-input-label">
        <span id="ipv4-cidr-label-text">IPv4 / CIDR</span>
        <input
          id="ipv4-cidr-input"
          value={input}
          onChange={handleChange}
          placeholder="e.g. 10.0.0.125/24"
          className="field-input"
        />
      </label>

      <div className="result-card insight-card" id="ipv4-insight-card">
        {analysis.error && <p className="error-text">{analysis.error}</p>}
        {analysis.prompt && <p className="result-summary">{analysis.prompt}</p>}
        {analysis.parsed && (
          <>
            <div className="cidr-display" aria-label="Inspected address" id="ipv4-inspect-display">
              <span className="cidr-prefix">Inspecting</span>
              <span className="cidr-octets">
                {analysis.colorisedIp.map((segment) => (
                  <span
                    key={segment.key}
                    className="cidr-segment"
                    style={segment.style}
                    data-role={segment.role}
                  >
                    {segment.value}
                  </span>
                ))}
              </span>
              <span className="cidr-separator">/</span>
              <span className="cidr-segment" style={{ color: analysis.colors.network }}>{analysis.prefix}</span>
            </div>

            <div className="progress-wrapper" id="ipv4-progress-wrapper">
              <div
                ref={progressTrackRef}
                className="progress-track"
                id="ipv4-insight-progress-track"
                style={progressTrackStyle}
                onMouseEnter={handleProgressEnter}
                onMouseLeave={handleProgressLeave}
                onMouseMove={handleProgressMove}
              >
                {/* Design agent: Visualise where usable hosts sit within the address range. */}
                <div
                  className="progress-host-window"
                  style={{
                    left: `${hostWindowStartPercent}%`,
                    width: `${hostWindowWidthPercent}%`,
                  }}
                />
                {/* Design agent: Fill reflects how many hosts precede the inspected endpoint. */}
                <div
                  className="progress-fill"
                  id="ipv4-insight-progress-gradient"
                  style={{
                    left: `${hostWindowStartPercent}%`,
                    width: `${activeHostFillPercent}%`,
                  }}
                />
                <div
                  className={`progress-indicator ${isProgressHovered ? 'is-hovered' : ''}`}
                  id="ipv4-progress-indicator"
                  style={{ left: `${activeIndicatorPercent}%`, transform: indicatorTransform }}
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
                  id="ipv4-progress-tooltip"
                >
                  {tooltipState.label}
                </div>
              )}
              <div className="progress-extents" id="ipv4-progress-extents">
                <span
                  className="endpoint"
                  id="ipv4-endpoint-network"
                  style={{ color: analysis.colors.network }}
                >
                  NET: {analysis.hostPortionNetwork}
                </span>
                <span
                  className="endpoint endpoint--right"
                  id="ipv4-endpoint-broadcast"
                  style={{ color: analysis.colors.host }}
                >
                  BRD: {analysis.hostPortionBroadcast}
                </span>
              </div>
            </div>

            <div className="insight-grid" id="ipv4-insight-columns">
              {analysis.boundaryBinary && (
                <div className="boundary-panel" id="ipv4-boundary-panel">
                  <p className="insight-title">
                    {`Boundary octet ${analysis.boundaryBinary.octetIndex + 1}`}
                  </p>
                  <p className="binary-octet">
                    <span style={{ color: analysis.colors.network }}>{analysis.boundaryBinary.networkBits}</span>
                    <span style={{ color: analysis.colors.host }}>{analysis.boundaryBinary.hostBits}</span>
                  </p>
                  <div className="boundary-guide" aria-hidden="true" id="ipv4-boundary-cidr-equation">
                    {/* Design agent: Color only the digit after '+', keep the rest neutral. */}
                    {(() => {
                      const eq = analysis.boundaryBinary.cidrEquation; // e.g. "/26 = 24 + 2"
                      const plusIndex = eq.indexOf('+');
                      if (plusIndex === -1) {
                        return (
                          <span className="boundary-count">{eq}</span>
                        );
                      }
                      const before = eq.slice(0, plusIndex + 1); // up to '+'
                      const after = eq.slice(plusIndex + 1).trim(); // digits after '+'
                      return (
                        <span className="boundary-count">
                          <span>{before} </span>
                          <span style={{ color: analysis.colors.network }}>{after}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div id="ipv4-total-hosts">
                <p className="insight-title">Total hosts</p>
                <p>{analysis.totalHosts.toLocaleString()}</p>
              </div>
              <div id="ipv4-mask-summary">
                <p className="insight-title">Mask</p>
                <p>{analysis.mask}</p>
              </div>
              <div id="ipv4-wildcard-summary">
                <p className="insight-title">Wildcard</p>
                <p>{analysis.wildcard}</p>
              </div>
              <div id="ipv4-type-summary">
                <p className="insight-title">Type</p>
                <p>{analysis.type}</p>
                {analysis.addressMetadata?.category === 'multicast' && analysis.addressMetadata.service && (
                  <p className="insight-meta" id="ipv4-multicast-service">
                    Service: {analysis.addressMetadata.service}
                  </p>
                )}
              </div>
              <div id="ipv4-class-summary">
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
// Design agent: Also export named for import flexibility and IDE refactors.
export { IpInspector };
