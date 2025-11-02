// Design agent: Streamlines the inspector with shared helpers and consistent palette usage.
// Developer agent: De-duplicates normalisation and gradient logic to simplify future changes.
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { normaliseWithTail } from '../utils/listNormalization';
import { createBitGradientStyle } from '../utils/bitStyling';
import OverallSummaryCard from './OverallSummaryCard';

// Design agent: Defines the chromatic palette used for network and host highlights.
const INSPECTOR_COLORS = {
  network: '#4F46E5',
  host: '#F97316',
};

// Design agent: Shares accent colours with the hierarchical planner for consistent theming.
// Developer agent: Centralises palette references used when syncing UI states.
const INSPECTOR_COLOR_B = 'var(--layer-color-b)';
const INSPECTOR_COLOR_C = 'var(--layer-color-c)';

const MAX_INSPECTOR_FIELDS = 24;

// Design agent: Configures the shared normaliser so the inspector maintains progressive fields.
// Developer agent: Ensures a single trailing blank entry regardless of user edits.
const INSPECTOR_FIELD_NORMALISER = {
  maxItems: MAX_INSPECTOR_FIELDS,
  createEmpty: () => '',
  cleanValue: (value) => (typeof value === 'string' ? value : ''),
  isEmpty: (value) => value.trim() === '',
};

// Design agent: Anticipates adjacent networks to help the user hop through sequential ranges.
// Developer agent: Calculates up to three valid follow-up network addresses for the active CIDR.
const buildNextNetworks = (parsed) => {
  if (!parsed) {
    return [];
  }

  const blockSize = 2 ** Math.max(0, 32 - parsed.prefix);
  if (blockSize <= 0) {
    return [];
  }

  const next = [];
  let candidate = parsed.network + blockSize;

  for (let index = 0; index < 3; index += 1) {
    if (candidate > 0xFFFFFFFF) {
      break;
    }
    next.push(`${intToIpv4(candidate)}/${parsed.prefix}`);
    candidate += blockSize;
  }

  return next;
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
// Developer agent: Emits deterministic segment entries so memoised views remain stable.
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
      const bitSlice = [];
      for (let bit = 0; bit < 8; bit += 1) {
        bitSlice.push(bit < partialBits ? colors.network : colors.host);
      }
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: createBitGradientStyle(bitSlice, colors.host),
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

// Design agent: Derives interpreted metrics for a specific IPv4 entry to drive its insight card.
// Developer agent: Normalises computed values so the presentation layer can remain stateless.
const buildInsightAnalysis = (rawValue) => {
  const trimmed = rawValue.trim();

  if (trimmed === '') {
    return {
      parsed: null,
      prompt: 'Enter an IPv4 address with CIDR to begin.',
    };
  }

  let parsed = parseCidr(trimmed);
  if (!parsed) {
    const ipIntOnly = ipv4ToInt(trimmed);
    if (ipIntOnly === null) {
      return {
        parsed: null,
        error: 'Invalid IPv4 or CIDR value. Try 192.168.1.10/24.',
      };
    }
    parsed = {
      ip: trimmed,
      prefix: 32,
      mask: 0xffffffff,
      network: ipIntOnly,
      broadcast: ipIntOnly,
    };
  }

  const ipInt = ipv4ToInt(parsed.ip);
  if (ipInt === null) {
    return {
      parsed: null,
      error: 'The IPv4 portion is not valid.',
    };
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
    totalRange === 0 ? 0 : Math.max(0, Math.min(1, (hostRangeStart - parsed.network) / totalRange));
  const hostWindowEndRatio =
    totalRange === 0 ? 1 : Math.max(0, Math.min(1, (hostRangeEnd - parsed.network) / totalRange));
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
    ? INSPECTOR_COLOR_B
    : isBroadcastAddress
    ? INSPECTOR_COLOR_C
    : INSPECTOR_COLORS.host;
  const hostBits = Math.max(0, 32 - parsed.prefix);
  // Design agent: Report the usable host count so UI metrics align with the progress bar.
  const totalHosts = parsed.prefix >= 31 ? totalAddresses : Math.max(0, totalAddresses - 2);
  const indicatorScale = Math.max(64, Math.min(240, 48 + hostBits * 12));
  const indicatorTextColor = isNetworkAddress
    ? INSPECTOR_COLOR_B
    : isBroadcastAddress
    ? INSPECTOR_COLOR_C
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
    nextNetworks: buildNextNetworks(parsed),
  };
};

// Design agent: Renders an IPv4 insight summary card directly beneath its entry field.
// Developer agent: Encapsulates tooltip interactions while delegating collapse state to the parent list.
function InspectorCard({ analysis, entryIndex, canCollapse, isCollapsed, onToggle }) {
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

  // Design agent: Guarantees unique DOM ids for repeated insight sections.
  // Developer agent: Keeps id construction declarative for easier maintenance.
  const buildId = (suffix) => `ipv4-insight-entry-${entryIndex}-${suffix}`;

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
    <div
      className={`result-card insight-card${analysis.parsed && canCollapse ? ' insight-card--collapsible' : ''}${isCollapsed ? ' is-collapsed' : ''}`}
      id={buildId('card')}
    >
      <div className="insight-card-header" id={buildId('card-header')}>
        <div className="insight-card-header-text" id={buildId('card-header-text')}>
          <span className="insight-card-label" id={buildId('card-label')}>
            IPv4 Insight
          </span>
          <span className="insight-card-summary" id={buildId('card-summary')}>
            {analysis.parsed
              ? `Inspecting ${analysis.inspectedIp}/${analysis.prefix}`
              : analysis.error
              ? 'Invalid IPv4/CIDR input'
              : analysis.prompt
              ? analysis.prompt
              : 'Enter an IPv4 / CIDR value'}
          </span>
        </div>
        {analysis.parsed && canCollapse && (
          <button
            type="button"
            className="insight-card-toggle"
            id={buildId('card-toggle')}
            onClick={onToggle}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        )}
      </div>
      <div className="insight-card-body" id={buildId('card-body')} aria-hidden={isCollapsed}>
        {analysis.error && <p className="error-text" id={buildId('card-error')}>{analysis.error}</p>}
        {!analysis.parsed && !analysis.error && analysis.prompt && (
          <p className="result-summary" id={buildId('card-prompt')}>
            {analysis.prompt}
          </p>
        )}
        {analysis.parsed && (
          <>
            <div className="cidr-display" aria-label="Inspected address" id={buildId('cidr-display')}>
              <span className="cidr-prefix" id={buildId('cidr-prefix')}>
                Inspecting
              </span>
              <span className="cidr-octets" id={buildId('cidr-octets')}>
                {analysis.colorisedIp.map((segment) => (
                  <span
                    key={segment.key}
                    className="cidr-segment"
                    id={buildId(`cidr-segment-${segment.key}`)}
                    style={segment.style}
                    data-role={segment.role}
                  >
                    {segment.value}
                  </span>
                ))}
              </span>
              <span className="cidr-separator" id={buildId('cidr-separator')}>/</span>
              <span
                className="cidr-segment"
                id={buildId('cidr-prefix-value')}
                style={{ color: analysis.colors.network }}
              >
                {analysis.prefix}
              </span>
            </div>

            <div className="progress-wrapper" id={buildId('progress-wrapper')}>
              <div
                ref={progressTrackRef}
                className="progress-track"
                id={buildId('progress-track')}
                style={progressTrackStyle}
                onMouseEnter={handleProgressEnter}
                onMouseLeave={handleProgressLeave}
                onMouseMove={handleProgressMove}
              >
                <div
                  className="progress-host-window"
                  id={buildId('progress-host-window')}
                  style={{
                    left: `${hostWindowStartPercent}%`,
                    width: `${hostWindowWidthPercent}%`,
                  }}
                />
                <div
                  className="progress-fill"
                  id={buildId('progress-fill')}
                  style={{
                    left: `${hostWindowStartPercent}%`,
                    width: `${activeHostFillPercent}%`,
                  }}
                />
                <div
                  className={`progress-indicator ${isProgressHovered ? 'is-hovered' : ''}`}
                  id={buildId('progress-indicator')}
                  style={{
                    left: `${activeIndicatorPercent}%`,
                    transform: indicatorTransform,
                    borderColor: analysis.indicatorAccent,
                  }}
                >
                  <span
                    id={buildId('progress-indicator-value')}
                    style={{ color: analysis.indicatorTextColor }}
                  >
                    {analysis.currentOctet}
                  </span>
                </div>
              </div>
              {tooltipState.isVisible && (
                <div
                  className={`progress-hover-tooltip progress-hover-tooltip--${tooltipState.side}`}
                  style={{
                    left: `${tooltipState.x}px`,
                    top: `${tooltipState.y}px`,
                  }}
                  id={buildId('progress-tooltip')}
                >
                  {tooltipState.label}
                </div>
              )}
              <div className="progress-extents" id={buildId('progress-extents')}>
                <span
                  className="endpoint"
                  id={buildId('endpoint-network')}
                  style={{ color: INSPECTOR_COLOR_B }}
                >
                  NET: {analysis.hostPortionNetwork}
                </span>
                <span
                  className="endpoint endpoint--right"
                  id={buildId('endpoint-broadcast')}
                  style={{ color: INSPECTOR_COLOR_C }}
                >
                  BRD: {analysis.hostPortionBroadcast}
                </span>
              </div>
            </div>

            <div className="insight-grid" id={buildId('insight-grid')}>
              {analysis.boundaryBinary && (
                <div className="boundary-panel" id={buildId('boundary-panel')}>
                  <p className="insight-title" id={buildId('boundary-title')}>
                    {`Boundary octet ${analysis.boundaryBinary.octetIndex + 1}`}
                  </p>
                  <p className="binary-octet" id={buildId('boundary-bits')}>
                    <span style={{ color: analysis.colors.network }}>{analysis.boundaryBinary.networkBits}</span>
                    <span style={{ color: analysis.colors.host }}>{analysis.boundaryBinary.hostBits}</span>
                  </p>
                  <div className="boundary-guide" aria-hidden="true" id={buildId('boundary-equation')}>
                    {(() => {
                      const eq = analysis.boundaryBinary.cidrEquation;
                      const plusIndex = eq.indexOf('+');
                      if (plusIndex === -1) {
                        return (
                          <span className="boundary-count" id={buildId('boundary-count')}>
                            {eq}
                          </span>
                        );
                      }
                      const before = eq.slice(0, plusIndex + 1);
                      const after = eq.slice(plusIndex + 1).trim();
                      return (
                        <span className="boundary-count" id={buildId('boundary-count-split')}>
                          <span id={buildId('boundary-count-before')}>{before} </span>
                          <span
                            id={buildId('boundary-count-after')}
                            style={{ color: analysis.colors.network }}
                          >
                            {after}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div id={buildId('total-hosts')}>
                <p className="insight-title" id={buildId('total-hosts-title')}>
                  Total hosts
                </p>
                <p id={buildId('total-hosts-value')}>
                  {analysis.totalHosts.toLocaleString()}
                </p>
              </div>
              <div id={buildId('mask-summary')}>
                <p className="insight-title" id={buildId('mask-title')}>
                  Mask
                </p>
                <p id={buildId('mask-value')}>{analysis.mask}</p>
              </div>
              <div id={buildId('wildcard-summary')}>
                <p className="insight-title" id={buildId('wildcard-title')}>
                  Wildcard
                </p>
                <p id={buildId('wildcard-value')}>{analysis.wildcard}</p>
              </div>
              <div id={buildId('type-summary')}>
                <p className="insight-title" id={buildId('type-title')}>
                  Type
                </p>
                <p id={buildId('type-value')}>{analysis.type}</p>
                {analysis.addressMetadata?.category === 'multicast' &&
                  analysis.addressMetadata.service && (
                    <p className="insight-meta" id={buildId('multicast-service')}>
                      Service: {analysis.addressMetadata.service}
                    </p>
                  )}
              </div>
              <div id={buildId('class-summary')}>
                <p className="insight-title" id={buildId('class-title')}>
                  Class
                </p>
                <p id={buildId('class-value')}>{analysis.ipClass}</p>
              </div>
              <div id={buildId('next-networks')}>
                <p className="insight-title" id={buildId('next-networks-title')}>
                  Next networks
                </p>
                {analysis.nextNetworks.length > 0 ? (
                  <ul className="insight-list" id={buildId('next-networks-list')}>
                    {analysis.nextNetworks.map((network, index) => (
                      <li key={network} id={buildId(`next-network-${index}`)}>
                        {network}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="insight-meta" id={buildId('next-networks-empty')}>
                    No further networks within range.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Design agent: Component exposing IPv4 insights with per-entry panels and Route Summarizer behaviour.
// Developer agent: Drives an editable list of IPv4/CIDR inputs, each backed by an independent insight card.
function IpInspector() {
  // Design agent: Seeds the inspector with a single empty entry governed by the shared normaliser.
  // Developer agent: Uses lazy initialisation to avoid repeated work during component mounts.
  const [entries, setEntries] = useState(() =>
    normaliseWithTail([''], INSPECTOR_FIELD_NORMALISER)
  );
  const inputRefs = useRef([]);
  // Design agent: Tracks collapsed panels so keyboard automation can tuck away previous insights.
  // Developer agent: Stores indices in an array to preserve predictable order when expanding/collapsing.
  const [collapsedEntries, setCollapsedEntries] = useState([]);
  // Design agent: Memorises which input currently holds focus for automatic collapse.
  // Developer agent: Keeps the index in state so effects can react consistently to focus shifts.
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);

  // Design agent: Compute live insight data for every entry while caching between renders.
  // Developer agent: Keeps expensive IPv4 math within memoisation bounds for performance.
  const analyses = useMemo(() => {
    return entries.map((value) => buildInsightAnalysis(value));
  }, [entries]);

  // Design agent: Tallies valid IPv4 rows, treating bare hosts as acceptable targets for insight cards.
  // Developer agent: Reads directly from the source entries so thresholds mirror the latest user edits.
  const validEntryCount = useMemo(() => {
    return entries.reduce((count, value) => {
      const trimmed = value.trim();
      if (trimmed === '') {
        return count;
      }
      if (parseCidr(trimmed)) {
        return count + 1;
      }
      return ipv4ToInt(trimmed) !== null ? count + 1 : count;
    }, 0);
  }, [entries]);

  // Design agent: Enables collapse controls as soon as two or more insights are populated.
  // Developer agent: Shares the flag with each entry to keep render conditions simple.
  const isCollapseEnabled = validEntryCount >= 2;

  // Design agent: Collapses a specific insight card while keeping the state immutable.
  // Developer agent: Avoids duplicate entries when collapsing the same index repeatedly.
  const collapseEntry = (index) => {
    if (index < 0) {
      return;
    }
    setCollapsedEntries((previous) => {
      if (previous.includes(index)) {
        return previous;
      }
      return [...previous, index];
    });
  };

  // Design agent: Allows manual toggling from the insight card header button.
  // Developer agent: Switches between collapsed and expanded states in a single handler.
  const toggleEntryCollapse = (index) => {
    setCollapsedEntries((previous) => {
      return previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index];
    });
  };

  // Design agent: Automatically collapses the previous panel when focus advances to the next input.
  // Developer agent: Reacts to focus changes so both keyboard and pointer navigation behave identically.
  useEffect(() => {
    if (!isCollapseEnabled || activeEntryIndex <= 0) {
      return;
    }
    const previousIndex = activeEntryIndex - 1;
    const previousAnalysis = analyses[previousIndex];
    if (!previousAnalysis || !previousAnalysis.parsed) {
      return;
    }
    collapseEntry(previousIndex);
  }, [activeEntryIndex, analyses, isCollapseEnabled]);

  // Design agent: Clears collapsed state when collapse is disabled or insights disappear.
  // Developer agent: Keeps the array aligned with rendered cards to avoid orphaned indices.
  useEffect(() => {
    if (!isCollapseEnabled) {
      setCollapsedEntries([]);
      return;
    }
    setCollapsedEntries((previous) => {
      const filtered = previous.filter((index) => analyses[index]?.parsed);
      return filtered.length === previous.length ? previous : filtered;
    });
  }, [analyses, isCollapseEnabled]);

  // Design agent: Moves the caret to a specific IPv4 field after auto-expansion.
  // Developer agent: Re-attempts focus until the next field exists to keep keyboard flow snappy.
  const focusEntryField = (index) => {
    const schedule =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (callback) => setTimeout(callback, 0);

    const tryFocus = (attempt = 0) => {
      const element = inputRefs.current[index];
      if (element) {
        const length = element.value.length;
        element.focus();
        element.setSelectionRange(length, length);
        setActiveEntryIndex(index);
        return;
      }
      if (attempt < 5) {
        schedule(() => tryFocus(attempt + 1));
      }
    };

    tryFocus();
  };

  // Design agent: Propagates edits through the inspector entries while keeping them normalised.
  // Developer agent: Updates the entry list and advances focus when a valid CIDR is completed.
  const handleEntryChange = (index, value, caretPosition) => {
    setEntries((previous) => {
      const next = [...previous];
      next[index] = value;
      return normaliseWithTail(next, INSPECTOR_FIELD_NORMALISER);
    });

    const caretAtEnd = typeof caretPosition === 'number' && caretPosition === value.length;
    const trimmed = value.trim();
    const parsed = parseCidr(trimmed);
    if (caretAtEnd && parsed) {
      const slashIndex = trimmed.indexOf('/');
      const suffix = slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : '';
      if (suffix.length >= 2) {
        const nextIndex = Math.min(index + 1, MAX_INSPECTOR_FIELDS - 1);
        focusEntryField(nextIndex);
      }
    }
  };

  // Design agent: Mirrors Route Summarizer key behaviour for fast keyboard-driven input.
  // Developer agent: Navigates the entry list with Enter/Backspace shortcuts.
  const handleEntryKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, entries.length - 1);
      focusEntryField(nextIndex);
      return;
    }

    if (event.key === 'Backspace' && entries[index].trim() === '' && index > 0) {
      event.preventDefault();
      focusEntryField(index - 1);
    }
  };

  return (
    <div className="column-content" id="ipv4-insight-panel">
      <div className="field-group" id="ipv4-insight-field-group">
        <span className="field-group-label" id="ipv4-insight-field-label">
          IPv4 / CIDR entries
        </span>
        {entries.map((value, index) => (
          <div
            className="insight-entry"
            id={`ipv4-insight-entry-${index}`}
            key={`ipv4-insight-entry-${index}`}
          >
            <label
              className="field"
              htmlFor={`ipv4-insight-input-${index}`}
              id={`ipv4-insight-label-${index}`}
            >
              <span id={`ipv4-insight-input-label-${index}`}>IPv4 / CIDR {index + 1}</span>
              <input
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                id={`ipv4-insight-input-${index}`}
                value={value}
                placeholder="e.g. 10.0.0.125/24"
                className="field-input"
                onChange={(event) =>
                  handleEntryChange(index, event.target.value, event.target.selectionStart)
                }
                onKeyDown={(event) => handleEntryKeyDown(event, index)}
                onFocus={() => setActiveEntryIndex(index)}
                autoComplete="off"
              />
            </label>
            <InspectorCard
              analysis={analyses[index]}
              entryIndex={index}
              canCollapse={isCollapseEnabled}
              isCollapsed={collapsedEntries.includes(index)}
              onToggle={() => {
                if (!isCollapseEnabled) {
                  return;
                }
                toggleEntryCollapse(index);
              }}
            />
          </div>
        ))}
      </div>
      {validEntryCount >= 2 && (
        <OverallSummaryCard analyses={analyses} />
      )}
    </div>
  );
}

export default IpInspector;
// Design agent: Also export named for import flexibility and IDE refactors.
export { IpInspector };
