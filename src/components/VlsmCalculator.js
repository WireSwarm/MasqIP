import { useMemo, useRef, useState } from 'react';
import {
  alignToBlock,
  formatMask,
  intToIpv4,
  parseCidr,
  getTotalAddressCount,
  getUsableHostCount,
} from '../utils/ipMath';

const MAX_SUBNET_FIELDS = 16;

// Design agent: Implements the hierarchical IPv4 VLSM calculator following the JLD method.
function VlsmCalculator() {
  const [baseNetwork, setBaseNetwork] = useState('');
  const [hostInputs, setHostInputs] = useState(['']);
  const inputRefs = useRef([]);

  // Design agent: Computes VLSM allocations reactively based on base network and host requests.
  const parsedResults = useMemo(() => {
    const parsedBase = parseCidr(baseNetwork);
    if (!parsedBase) {
      if (baseNetwork.trim() === '') {
        return { pending: true };
      }
      return { error: 'Invalid base network (use format x.x.x.x/yy).' };
    }

    const networkCapacity = getTotalAddressCount(parsedBase.prefix);
    const usableCapacity = getUsableHostCount(parsedBase.prefix);

    const requests = hostInputs
      .map((value, index) => ({
        index,
        raw: value,
        hosts: Number(value),
      }))
      .filter((entry) => entry.raw.trim() !== '');

    const invalidEntry = requests.find(
      (entry) => Number.isNaN(entry.hosts) || entry.hosts < 0,
    );
    if (invalidEntry) {
      return { error: `Invalid host count in subnet ${invalidEntry.index + 1}.` };
    }

    const sorted = [...requests].sort((a, b) => b.hosts - a.hosts);
    const allocations = [];
    const baseStart = parsedBase.network;
    const baseEnd = baseStart + networkCapacity;
    let cursor = baseStart;

    for (const request of sorted) {
      const neededAddresses = request.hosts <= 0 ? 2 : request.hosts + 2;
      const blockSize = 2 ** Math.ceil(Math.log2(Math.max(neededAddresses, 2)));
      const prefix = 32 - Math.log2(blockSize);

      let alignedStart = cursor;
      if ((cursor - baseStart) % blockSize !== 0) {
        alignedStart = alignToBlock(cursor, blockSize, baseStart);
      }

      if (alignedStart + blockSize > baseEnd) {
        return {
          error: `Subnet ${request.index + 1} does not fit inside ${parsedBase.ip}/${parsedBase.prefix}.`,
        };
      }

      allocations.push({
        ...request,
        prefix,
        network: alignedStart,
        broadcast: alignedStart + blockSize - 1,
        blockSize,
      });
      cursor = alignedStart + blockSize;
    }

    const byIndex = allocations.reduce((acc, allocation) => {
      acc[allocation.index] = allocation;
      return acc;
    }, {});

    const firstUsableInt = parsedBase.prefix >= 31 ? parsedBase.network : parsedBase.network + 1;
    const lastUsableInt = parsedBase.prefix >= 31 ? parsedBase.broadcast : parsedBase.broadcast - 1;

    return {
      pending: false,
      parsedBase,
      usableCapacity,
      usableRange: {
        start: intToIpv4(firstUsableInt),
        end: intToIpv4(lastUsableInt),
      },
      requests: hostInputs.length,
      allocations: hostInputs.map((_, index) => byIndex[index] || null),
    };
  }, [baseNetwork, hostInputs]);

  // Design agent: Updates the base network input.
  const handleBaseChange = (event) => {
    setBaseNetwork(event.target.value);
  };

  // Design agent: Ensures there is always an empty trailing subnet field when needed.
  const appendFieldIfNeeded = (index, focusNext) => {
    let appended = false;
    setHostInputs((prev) => {
      if (index !== prev.length - 1) {
        return prev;
      }
      if (prev[index].trim() === '' || prev.length >= MAX_SUBNET_FIELDS) {
        return prev;
      }
      appended = true;
      return [...prev, ''];
    });
    if (appended && focusNext) {
      queueMicrotask(() => {
        inputRefs.current[index + 1]?.focus();
      });
    }
  };

  // Design agent: Stores host field edits while preserving numeric-only content.
  const handleHostChange = (index, value) => {
    setHostInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Design agent: Provides keyboard navigation for subnet fields.
  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      appendFieldIfNeeded(index, true);
      const nextIndex = Math.min(index + 1, hostInputs.length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="column-content">
      <label className="field">
        <span>Base network (CIDR)</span>
        <input
          value={baseNetwork}
          onChange={handleBaseChange}
          placeholder="e.g. 192.168.0.0/24"
          className="field-input"
        />
      </label>

      <div className="field-group">
        <span className="field-group-label">Usable hosts per subnet</span>
        {hostInputs.map((value, index) => (
          <label key={index} className="field">
            <span>Subnet {index + 1}</span>
            <input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={value}
              inputMode="numeric"
              pattern="\d*"
              placeholder="e.g. 120"
              className="field-input"
              onChange={(event) => handleHostChange(index, event.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onBlur={() => appendFieldIfNeeded(index, false)}
            />
          </label>
        ))}
      </div>

      <div className="result-card">
        {parsedResults.error ? (
          <p className="error-text">{parsedResults.error}</p>
        ) : parsedResults.pending ? (
          <p className="result-summary">Provide a base network to begin planning.</p>
        ) : (
          <>
            <p className="result-summary">
              Base capacity: {parsedResults.usableCapacity.toLocaleString()} usable addresses.
            </p>
            <p className="result-summary">
              Usable range: {parsedResults.usableRange.start} – {parsedResults.usableRange.end}
            </p>
            <ul className="result-list">
              {parsedResults.allocations.map((allocation, index) => (
                <li key={index} className="result-item">
                  {allocation ? (
                    <>
                      <span className="result-title">
                        Subnet {index + 1}: {intToIpv4(allocation.network)}/{allocation.prefix}
                      </span>
                      <span className="result-meta">
                        Range {intToIpv4(allocation.network)} – {intToIpv4(allocation.broadcast)} ·
                        mask {formatMask((~0 << (32 - allocation.prefix)) >>> 0)}
                      </span>
                    </>
                  ) : (
                    <span className="result-title muted">Awaiting size…</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default VlsmCalculator;
