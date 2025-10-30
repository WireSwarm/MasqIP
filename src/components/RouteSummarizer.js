import { useMemo, useRef, useState } from 'react';
import {
  commonPrefixLength,
  intToIpv4,
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
    const entries = routes
      .map((raw, index) => ({ raw: raw.trim(), index }))
      .filter((item) => item.raw.length > 0);

    if (entries.length === 0) {
      return { label: 'Waiting for networks…' };
    }

    const parsed = entries.map((entry) => {
      const cidr = parseCidr(entry.raw);
      return { ...entry, cidr };
    });

    const invalid = parsed.find((entry) => !entry.cidr);
    if (invalid) {
      return { error: `Invalid network at row ${invalid.index + 1}.` };
    }

    const networks = parsed.map((entry) => entry.cidr);
    let minNetwork = networks[0].network;
    let maxBroadcast = networks[0].broadcast;

    for (const network of networks) {
      minNetwork = Math.min(minNetwork, network.network);
      maxBroadcast = Math.max(maxBroadcast, network.broadcast);
    }

    const prefix = commonPrefixLength(minNetwork, maxBroadcast);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const summaryNetwork = minNetwork & mask;

    return {
      networks: entries.length,
      summary: `${intToIpv4(summaryNetwork >>> 0)}/${prefix}`,
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
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteSummarizer;
