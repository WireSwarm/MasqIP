// Design agent: Optimises the IPv4 route summariser by sharing core utilities across tools.
// Developer agent: Centralises dynamic field normalisation and tightens early validation feedback.
import { useMemo, useRef, useState } from 'react';
import {
  commonPrefixLength,
  intToIpv4,
  ipv4ToInt,
  parseCidr,
} from '../utils/ipMath';
import { normaliseWithTail } from '../utils/listNormalization';

const MAX_ROUTE_FIELDS = 24;

// Design agent: Configures the shared list normaliser used for summariser inputs.
// Developer agent: Guarantees only one trailing empty row while preserving raw user input.
const ROUTE_FIELD_NORMALISER = {
  maxItems: MAX_ROUTE_FIELDS,
  createEmpty: () => '',
  cleanValue: (value) => (typeof value === 'string' ? value : ''),
  isEmpty: (value) => value.trim() === '',
};

// Design agent: Implements the live IPv4 route summarization helper with dynamic inputs.
// Developer agent: Wraps state and memoised calculations to avoid unnecessary re-renders.
function RouteSummarizer() {
  const [routes, setRoutes] = useState(() => normaliseWithTail([''], ROUTE_FIELD_NORMALISER));
  const inputRefs = useRef([]);

  // Design agent: Focuses a specific network field and places the caret at the end.
  // Developer agent: Uses microtasks to align the caret post-render without blocking input.
  const focusRouteField = (index) => {
    queueMicrotask(() => {
      const element = inputRefs.current[index];
      if (element) {
        const length = element.value.length;
        element.focus();
        element.setSelectionRange(length, length);
      }
    });
  };

  // Design agent: Calculates the aggregated summary prefix from all entered networks.
  // Developer agent: Memoises expensive CIDR maths so UI updates stay responsive.
  const summary = useMemo(() => {
    // Design agent: Baseline reminder about the shared-mask behaviour.
    const defaultInheritanceMessage = 'Entries without a mask inherit the first specified mask.';

    const entries = routes
      .map((raw, index) => ({ raw: raw.trim(), index }))
      .filter((item) => item.raw.length > 0);

    if (entries.length === 0) {
      return { label: 'Waiting for networks.', inheritanceMessage: defaultInheritanceMessage };
    }

    let assumedPrefix = null;
    let assumedMask = null;
    const resolvedNetworks = [];
    const pendingNetworks = [];

    for (const entry of entries) {
      if (entry.raw.includes('/')) {
        const cidr = parseCidr(entry.raw);
        if (!cidr) {
          return { error: `Invalid network at row ${entry.index + 1}.` };
        }
        if (assumedPrefix === null) {
          assumedPrefix = cidr.prefix;
          assumedMask = cidr.mask;
        } else if (cidr.prefix !== assumedPrefix) {
          return {
            error: `Mask mismatch at row ${entry.index + 1}. Expected /${assumedPrefix}.`,
          };
        }
        resolvedNetworks.push(cidr);
      } else {
        const ipInt = ipv4ToInt(entry.raw);
        if (ipInt === null) {
          return { error: `Invalid IPv4 address at row ${entry.index + 1}.` };
        }
        pendingNetworks.push({ index: entry.index, ip: entry.raw, ipInt });
      }
    }

    if (assumedPrefix === null) {
      return {
        error: 'Provide the mask for at least one network so it can be applied to the others.',
      };
    }

    if (assumedMask === null) {
      assumedMask = assumedPrefix === 0 ? 0 : (~0 << (32 - assumedPrefix)) >>> 0;
    }

    for (const pending of pendingNetworks) {
      const network = pending.ipInt & assumedMask;
      const broadcast = network | (~assumedMask >>> 0);
      resolvedNetworks.push({
        ip: pending.ip,
        prefix: assumedPrefix,
        mask: assumedMask,
        network,
        broadcast,
      });
    }

    const networks = resolvedNetworks;
    let minNetwork = networks[0].network;
    let maxBroadcast = networks[0].broadcast;

    for (const network of networks) {
      minNetwork = Math.min(minNetwork, network.network);
      maxBroadcast = Math.max(maxBroadcast, network.broadcast);
    }

    const prefix = commonPrefixLength(minNetwork, maxBroadcast);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const summaryNetwork = minNetwork & mask;

    const assumedCount = pendingNetworks.length;
    const assumptionNote =
      assumedCount > 0
        ? `Applied /${assumedPrefix} to ${assumedCount} entr${assumedCount === 1 ? 'y' : 'ies'} without a mask.`
        : null;

    // Design agent: Persistent reminder so users understand the shared-mask behaviour.
    const inheritanceMessage = `Entries without a mask inherit the first specified /${assumedPrefix}.`;

    return {
      networks: entries.length,
      summary: `${intToIpv4(summaryNetwork >>> 0)}/${prefix}`,
      assumptionNote,
      inheritanceMessage,
    };
  }, [routes]);

  // Design agent: Updates a specific network field and manages focus behaviour.
  // Developer agent: Normalises field lists and advances focus when CIDR prefixes complete.
  const handleRouteChange = (index, value, caretPosition) => {
    // Design agent: Detects when a CIDR suffix is complete so focus can advance automatically.
    const cidrMatch = value.match(/\/(\d{1,2})$/);
    const caretAtEnd = typeof caretPosition === 'number' && caretPosition === value.length;
    const prefixNumber = cidrMatch ? Number(cidrMatch[1]) : null;
    const hasCompletePrefix =
      cidrMatch != null && cidrMatch[1].length >= 2 && prefixNumber != null && prefixNumber <= 32;

    setRoutes((prev) => {
      const next = [...prev];
      next[index] = value;
      return normaliseWithTail(next, ROUTE_FIELD_NORMALISER);
    });

    if (caretAtEnd && hasCompletePrefix) {
      const nextIndex = Math.min(index + 1, MAX_ROUTE_FIELDS - 1);
      focusRouteField(nextIndex);
    }
  };

  // Design agent: Handles enter key presses to focus the next field.
  // Developer agent: Adds keyboard affordances for faster power-user entry.
  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, routes.length - 1);
      focusRouteField(nextIndex);
      return;
    }

    if (event.key === 'Backspace' && routes[index].trim() === '' && index > 0) {
      event.preventDefault();
      focusRouteField(index - 1);
    }
  };

  return (
    <div className="column-content" id="summarizer-root">
      <div className="field-group" id="summarizer-field-group">
        <span className="field-group-label" id="summarizer-field-label">Networks to summarise</span>
        {routes.map((value, index) => (
          <label key={index} className="field" id={`summarizer-field-${index}`}>
            <span id={`summarizer-input-label-${index}`}>Network {index + 1}</span>
            <input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              id={`summarizer-input-${index}`}
              value={value}
              placeholder="e.g. 192.168.10.0/24"
              className="field-input"
              onChange={(event) => handleRouteChange(index, event.target.value, event.target.selectionStart)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          </label>
        ))}
      </div>

      <div className="result-card" id="summarizer-results">
        {summary.error ? (
          <p className="error-text" id="summarizer-error">{summary.error}</p>
        ) : (
          <div className="result-summary" id="summarizer-summary">
            <p id="summarizer-summary-label">{summary.label || `Routes entered: ${summary.networks}`}</p>
            {summary.summary && (
              <p className="result-highlight" id="summarizer-summary-result">Route summary: {summary.summary}</p>
            )}
            <p className="result-meta" id="summarizer-inheritance">{summary.inheritanceMessage}</p>
            {summary.assumptionNote && (
              <p className="result-meta" id="summarizer-assumption">{summary.assumptionNote}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteSummarizer;
// Design agent: Also export named for import flexibility and IDE refactors.
export { RouteSummarizer };
