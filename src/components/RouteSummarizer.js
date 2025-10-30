import { useMemo, useRef, useState } from 'react';
import {
  commonPrefixLength,
  intToIpv4,
  ipv4ToInt,
  parseCidr,
} from '../utils/ipMath';

const MAX_ROUTE_FIELDS = 24;

// Design agent: Normalises network inputs so only one trailing empty field remains.
const normaliseRouteFields = (values) => {
  const normalised = [];
  let hasTrailingEmpty = false;

  for (const value of values) {
    if (value.trim() === '') {
      if (!hasTrailingEmpty) {
        normalised.push('');
        hasTrailingEmpty = true;
      }
    } else {
      normalised.push(value);
      hasTrailingEmpty = false;
    }
    if (normalised.length === MAX_ROUTE_FIELDS) {
      break;
    }
  }

  if (!hasTrailingEmpty && normalised.length < MAX_ROUTE_FIELDS) {
    normalised.push('');
  }

  return normalised;
};

// Design agent: Implements the live IPv4 route summarization helper with dynamic inputs.
function RouteSummarizer() {
  const [routes, setRoutes] = useState(['']);
  const inputRefs = useRef([]);

  // Design agent: Focuses a specific network field and places the caret at the end.
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
  const handleRouteChange = (index, value) => {
    setRoutes((prev) => {
      const next = [...prev];
      next[index] = value;
      return normaliseRouteFields(next);
    });
  };

  // Design agent: Handles enter key presses to focus the next field.
  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, routes.length - 1);
      focusRouteField(nextIndex);
      return;
    }

    if (event.key === 'Backspace' && routes[index].trim() === '' && index > 0) {
      event.preventDefault();
      const targetIndex = index - 1;
      setRoutes((prev) => {
        const next = [...prev];
        const previousValue = next[targetIndex] ?? '';
        next[targetIndex] = previousValue.slice(0, -1);
        return normaliseRouteFields(next);
      });
      focusRouteField(targetIndex);
    }
  };

  return (
    <div className="column-content">
      <div className="field-group">
        <span className="field-group-label">Networks to summarise</span>
        {routes.map((value, index) => (
          <label key={index} className="field">
            <span>Network {index + 1}</span>
            <input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={value}
              placeholder="e.g. 192.168.10.0/24"
              className="field-input"
              onChange={(event) => handleRouteChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          </label>
        ))}
      </div>

      <div className="result-card">
        {summary.error ? (
          <p className="error-text">{summary.error}</p>
        ) : (
          <div className="result-summary">
            <p>{summary.label || `Routes entered: ${summary.networks}`}</p>
            {summary.summary && <p className="result-highlight">Route summary: {summary.summary}</p>}
            <p className="result-meta">{summary.inheritanceMessage}</p>
            {summary.assumptionNote && <p className="result-meta">{summary.assumptionNote}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteSummarizer;
