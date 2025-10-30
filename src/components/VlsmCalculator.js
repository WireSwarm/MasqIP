import { useMemo, useRef, useState } from 'react';
import {
  alignToBlock,
  formatMask,
  getTotalAddressCount,
  getUsableHostCount,
  intToIpv4,
  parseCidr,
} from '../utils/ipMath';

const MAX_SUBNET_FIELDS = 16;
const MAX_MULTIPLIER = 64;

// Design agent: Computes the minimum bit width needed to cover a numerical count.
const bitsForCount = (count) => {
  if (count <= 1) {
    return 0;
  }
  return Math.ceil(Math.log2(count));
};

// Design agent: Builds a readable dotted template describing how each octet is derived.
const buildPathSchema = (parsedSupernet, levelBits, remainingHostBits) => {
  const baseOctets = intToIpv4(parsedSupernet.network).split('.').map(Number);
  const octetSegments = [[], [], [], []];
  let bitCursor = parsedSupernet.prefix;

  for (const level of levelBits) {
    let bitsLeft = level.bits;
    while (bitsLeft > 0) {
      const octetIndex = Math.floor(bitCursor / 8);
      const offset = bitCursor % 8;
      const available = 8 - offset;
      const chunk = Math.min(bitsLeft, available);
      octetSegments[octetIndex].push({
        label: level.label,
        bits: chunk,
        offset,
      });
      bitCursor += chunk;
      bitsLeft -= chunk;
    }
  }

  let hostBitsLeft = remainingHostBits;
  while (hostBitsLeft > 0) {
    const octetIndex = Math.floor(bitCursor / 8);
    const offset = bitCursor % 8;
    const available = 8 - offset;
    const chunk = Math.min(hostBitsLeft, available);
    octetSegments[octetIndex].push({
      label: 'host',
      bits: chunk,
      offset,
    });
    bitCursor += chunk;
    hostBitsLeft -= chunk;
  }

  const templateOctets = baseOctets.map((value, index) => {
    const octetStart = index * 8;
    const fixedBits = Math.max(0, Math.min(parsedSupernet.prefix - octetStart, 8));
    const dynamicSegments = octetSegments[index];

    if (fixedBits === 8 || dynamicSegments.length === 0) {
      return `${value}`;
    }

    const dynamicBits = 8 - fixedBits;
    const fillsOctet =
      fixedBits === 0 && dynamicSegments.length === 1 && dynamicSegments[0].bits === 8;

    if (fillsOctet) {
      return `[${dynamicSegments[0].label}]`;
    }

    const summary = dynamicSegments
      .map((segment) => `${segment.label}${segment.bits !== dynamicBits ? `:${segment.bits}b` : ''}`)
      .join(' · ');

    if (fixedBits === 0) {
      return `[${summary}]`;
    }

    return `${value} + [${summary}]`;
  });

  return templateOctets.join('.');
};

// Design agent: Produces a mask integer from a CIDR prefix length.
const maskFromPrefix = (prefix) => {
  if (prefix === 0) {
    return 0;
  }
  return (~0 << (32 - prefix)) >>> 0;
};

// Design agent: Implements hierarchical IPv4 planning with multiplier support and path-based schemes.
function VlsmCalculator() {
  const [baseNetwork, setBaseNetwork] = useState('');
  const [hostInputs, setHostInputs] = useState([{ hosts: '', multiplier: '1' }]);
  const [mode, setMode] = useState('method1');
  const [pathSupernet, setPathSupernet] = useState('');
  const [pathLevels, setPathLevels] = useState([
    { label: 'Building', count: '' },
    { label: 'Floor', count: '' },
  ]);
  const [leafSize, setLeafSize] = useState('');
  const inputRefs = useRef([]);

  // Design agent: Computes addressing plans for method 1 (host-driven VLSM).
  const methodOneResults = useMemo(() => {
    const parsedBase = parseCidr(baseNetwork);
    if (!parsedBase) {
      if (baseNetwork.trim() === '') {
        return { pending: true };
      }
      return { error: 'Invalid base network (use format x.x.x.x/yy).' };
    }

    const usableCapacity = getUsableHostCount(parsedBase.prefix);
    const networkCapacity = getTotalAddressCount(parsedBase.prefix);
    const groups = hostInputs.map((entry, index) => ({
      index,
      hostsRaw: entry.hosts,
      multiplierRaw: entry.multiplier,
    }));

    const activeGroups = groups.filter((group) => group.hostsRaw.trim() !== '');
    if (activeGroups.length === 0) {
      return {
        pending: true,
        parsedBase,
        usableCapacity,
      };
    }

    const expanded = [];
    for (const group of activeGroups) {
      const hosts = Number(group.hostsRaw);
      if (Number.isNaN(hosts) || hosts < 0) {
        return { error: `Invalid host count in subnet ${group.index + 1}.` };
      }
      const multiplier = group.multiplierRaw.trim() === '' ? 1 : Number(group.multiplierRaw);
      if (Number.isNaN(multiplier) || multiplier < 1) {
        return { error: `Multiplier in subnet ${group.index + 1} must be at least 1.` };
      }
      if (multiplier > MAX_MULTIPLIER) {
        return { error: `Multiplier in subnet ${group.index + 1} is too large (max ${MAX_MULTIPLIER}).` };
      }

      for (let copy = 0; copy < multiplier; copy += 1) {
        expanded.push({
          groupIndex: group.index,
          instance: copy,
          hosts,
        });
      }
    }

    const sorted = [...expanded].sort((a, b) => {
      if (b.hosts !== a.hosts) {
        return b.hosts - a.hosts;
      }
      return a.groupIndex - b.groupIndex;
    });

    const baseStart = parsedBase.network;
    const baseEnd = baseStart + networkCapacity;
    let cursor = baseStart;
    const allocationsByGroup = hostInputs.map(() => []);

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
          error: `Subnet ${request.groupIndex + 1} does not fit inside ${intToIpv4(parsedBase.network)}/${parsedBase.prefix}.`,
        };
      }

      allocationsByGroup[request.groupIndex][request.instance] = {
        prefix,
        network: alignedStart,
        broadcast: alignedStart + blockSize - 1,
        blockSize,
        hosts: request.hosts,
      };
      cursor = alignedStart + blockSize;
    }

    const firstUsable = parsedBase.prefix >= 31 ? parsedBase.network : parsedBase.network + 1;
    const lastUsable = parsedBase.prefix >= 31 ? parsedBase.broadcast : parsedBase.broadcast - 1;

    return {
      parsedBase,
      usableCapacity,
      usableRange: {
        start: intToIpv4(firstUsable),
        end: intToIpv4(lastUsable),
      },
      totalSubnets: sorted.length,
      groups: hostInputs.map((_, index) => ({
        allocations: allocationsByGroup[index]?.filter(Boolean) ?? [],
      })),
    };
  }, [baseNetwork, hostInputs]);

  // Design agent: Computes addressing plans for method 2 (path-based hierarchy).
  const methodTwoPlan = useMemo(() => {
    if (pathSupernet.trim() === '') {
      return { pending: true };
    }

    const parsedBase = parseCidr(pathSupernet);
    if (!parsedBase) {
      return { error: 'Invalid supernet (use format x.x.x.x/yy).' };
    }

    const hostBitsAvailable = 32 - parsedBase.prefix;
    const levelDescriptors = pathLevels.map((level, index) => ({
      index,
      label: level.label.trim() || `Level ${index + 1}`,
      rawCount: level.count,
    }));

    const activeLevels = levelDescriptors.filter((level) => level.rawCount.trim() !== '');
    if (activeLevels.length === 0) {
      return {
        pending: true,
        parsedBase,
        note: 'Provide at least one path dimension.',
      };
    }

    const parsedLevels = [];
    for (const level of activeLevels) {
      const count = Number(level.rawCount);
      if (Number.isNaN(count) || count < 1) {
        return { error: `Invalid count for ${level.label}.` };
      }
      parsedLevels.push({
        ...level,
        count,
        bits: bitsForCount(count),
      });
    }

    const totalLevelBits = parsedLevels.reduce((sum, level) => sum + level.bits, 0);
    if (totalLevelBits > hostBitsAvailable) {
      return {
        error: `Path dimensions require ${totalLevelBits} host bits but only ${hostBitsAvailable} are available in the supernet.`,
      };
    }

    const trimmedLeaf = leafSize.trim();
    if (trimmedLeaf === '') {
      return {
        pending: true,
        parsedBase,
        parsedLevels,
        note: 'Specify the network size per leaf.',
      };
    }

    const leafAddresses = Number(trimmedLeaf);
    if (Number.isNaN(leafAddresses) || leafAddresses < 1) {
      return { error: 'Network size must be a positive integer.' };
    }

    const leafBits = bitsForCount(leafAddresses);
    const remainingHostBits = hostBitsAvailable - totalLevelBits;
    if (leafBits > remainingHostBits) {
      return {
        error: `Leaf networks need ${leafBits} host bits but only ${remainingHostBits} remain after reserving path dimensions.`,
      };
    }

    const finalPrefix = parsedBase.prefix + totalLevelBits;
    const addressesPerLeaf = 2 ** remainingHostBits;
    const usableHostsPerLeaf =
      remainingHostBits >= 2 ? Math.max(0, addressesPerLeaf - 2) : addressesPerLeaf;
    const template = buildPathSchema(parsedBase, parsedLevels, remainingHostBits);

    return {
      parsedBase,
      parsedLevels,
      finalPrefix,
      remainingHostBits,
      addressesPerLeaf,
      usableHostsPerLeaf,
      template,
    };
  }, [leafSize, pathLevels, pathSupernet]);

  // Design agent: Updates the base network input for method 1.
  const handleBaseChange = (event) => {
    setBaseNetwork(event.target.value);
  };

  // Design agent: Switches between the two planning methods.
  const handleModeChange = (nextMode) => {
    setMode(nextMode);
  };

  // Design agent: Ensures there is always an empty trailing subnet field when needed.
  const appendFieldIfNeeded = (index, focusNext) => {
    let appended = false;
    setHostInputs((prev) => {
      if (index !== prev.length - 1) {
        return prev;
      }
      if (prev[index].hosts.trim() === '' || prev.length >= MAX_SUBNET_FIELDS) {
        return prev;
      }
      appended = true;
      return [...prev, { hosts: '', multiplier: '1' }];
    });
    if (appended && focusNext) {
      queueMicrotask(() => {
        inputRefs.current[index + 1]?.focus();
      });
    }
  };

  // Design agent: Stores edits for host counts and multipliers.
  const handleHostChange = (index, field, value) => {
    setHostInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
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

  // Design agent: Updates the supernet used in method 2.
  const handleSupernetChange = (event) => {
    setPathSupernet(event.target.value);
  };

  // Design agent: Stores changes for path dimension labels or counts.
  const handleLevelChange = (index, field, value) => {
    setPathLevels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Design agent: Adds a new hierarchical dimension row.
  const handleAddLevel = () => {
    setPathLevels((prev) => {
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, { label: `Level ${prev.length + 1}`, count: '' }];
    });
  };

  // Design agent: Removes a hierarchical dimension row.
  const handleRemoveLevel = (index) => {
    setPathLevels((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Design agent: Updates the desired network size per leaf in method 2.
  const handleLeafSizeChange = (event) => {
    setLeafSize(event.target.value.replace(/[^\d]/g, ''));
  };

  return (
    <div className="column-content">
      <div className="method-toggle">
        <button
          type="button"
          className={`toggle-button ${mode === 'method1' ? 'is-active' : ''}`}
          onClick={() => handleModeChange('method1')}
        >
          Method 1 · Host sizing
        </button>
        <button
          type="button"
          className={`toggle-button ${mode === 'method2' ? 'is-active' : ''}`}
          onClick={() => handleModeChange('method2')}
        >
          Method 2 · Path plan
        </button>
      </div>

      {mode === 'method1' && (
        <>
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
            {hostInputs.map((entry, index) => (
              <div key={index} className="field field-matrix">
                <span>Subnet {index + 1}</span>
                <div className="field-row">
                  <input
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    value={entry.hosts}
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="e.g. 120"
                    className="field-input"
                    onChange={(event) =>
                      handleHostChange(index, 'hosts', event.target.value.replace(/[^\d]/g, ''))
                    }
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onBlur={() => appendFieldIfNeeded(index, false)}
                  />
                  <input
                    value={entry.multiplier}
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="× copies"
                    className="field-input multiplier-input"
                    onChange={(event) =>
                      handleHostChange(index, 'multiplier', event.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="result-card">
            {methodOneResults.error ? (
              <p className="error-text">{methodOneResults.error}</p>
            ) : methodOneResults.pending ? (
              <p className="result-summary">Provide a base network and host sizes to begin planning.</p>
            ) : (
              <>
                <p className="result-summary">
                  Base capacity: {methodOneResults.usableCapacity.toLocaleString()} usable addresses.
                </p>
                <p className="result-summary">
                  Total subnets generated: {methodOneResults.totalSubnets.toLocaleString()}
                </p>
                <p className="result-summary">
                  Usable range: {methodOneResults.usableRange.start} – {methodOneResults.usableRange.end}
                </p>
                <ul className="result-list">
                  {methodOneResults.groups.map((group, index) => (
                    <li key={index} className="result-item">
                      {group.allocations.length > 0 ? (
                        <>
                          <span className="result-title">
                            Subnet group {index + 1} ({group.allocations.length}×)
                          </span>
                          <ul className="result-sublist">
                            {group.allocations.map((allocation, instanceIndex) => (
                              <li key={instanceIndex} className="result-subitem">
                                <span className="result-title">
                                  Plan {instanceIndex + 1}: {intToIpv4(allocation.network)}/{allocation.prefix}
                                </span>
                                <span className="result-meta">
                                  Range {intToIpv4(allocation.network)} – {intToIpv4(allocation.broadcast)} · mask{' '}
                                  {formatMask(maskFromPrefix(allocation.prefix))}
                                </span>
                              </li>
                            ))}
                          </ul>
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
        </>
      )}

      {mode === 'method2' && (
        <>
          <label className="field">
            <span>Supernet (CIDR)</span>
            <input
              value={pathSupernet}
              onChange={handleSupernetChange}
              placeholder="e.g. 10.0.0.0/8"
              className="field-input"
            />
          </label>

          <div className="field-group">
            <span className="field-group-label">Path dimensions</span>
            {pathLevels.map((level, index) => (
              <div key={index} className="field multi-field">
                <div className="field-row textual">
                  <input
                    value={level.label}
                    placeholder={`Level ${index + 1}`}
                    className="field-input text-input"
                    onChange={(event) => handleLevelChange(index, 'label', event.target.value)}
                  />
                  <input
                    value={level.count}
                    inputMode="numeric"
                    pattern="\d*"
                    placeholder="Count"
                    className="field-input"
                    onChange={(event) =>
                      handleLevelChange(index, 'count', event.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                  {pathLevels.length > 1 && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleRemoveLevel(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="accent-button" onClick={handleAddLevel}>
              Add dimension
            </button>
          </div>

          <label className="field">
            <span>Network size per leaf (addresses)</span>
            <input
              value={leafSize}
              inputMode="numeric"
              pattern="\d*"
              placeholder="e.g. 256"
              className="field-input"
              onChange={handleLeafSizeChange}
            />
          </label>

          <div className="result-card">
            {methodTwoPlan.error ? (
              <p className="error-text">{methodTwoPlan.error}</p>
            ) : methodTwoPlan.pending ? (
              <p className="result-summary">
                {methodTwoPlan.note || 'Enter supernet, dimensions, and leaf size to generate a plan.'}
              </p>
            ) : (
              <>
                <p className="result-summary">
                  Supernet: {intToIpv4(methodTwoPlan.parsedBase.network)}/{methodTwoPlan.parsedBase.prefix} → leaf
                  prefix /{methodTwoPlan.finalPrefix}
                </p>
                <p className="result-summary">
                  Each leaf covers {methodTwoPlan.addressesPerLeaf.toLocaleString()} addresses (
                  {methodTwoPlan.usableHostsPerLeaf.toLocaleString()} usable).
                </p>
                <p className="result-summary">Schema: {methodTwoPlan.template}</p>
                <ul className="result-list compact">
                  {methodTwoPlan.parsedLevels.map((level) => (
                    <li key={level.label} className="result-item">
                      <span className="result-title">{level.label}</span>
                      <span className="result-meta">
                        {level.count.toLocaleString()} options · {level.bits} bit{level.bits === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                  <li className="result-item">
                    <span className="result-title">Leaf network</span>
                    <span className="result-meta">
                      Host space retains {methodTwoPlan.remainingHostBits} bit
                      {methodTwoPlan.remainingHostBits === 1 ? '' : 's'}
                    </span>
                  </li>
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default VlsmCalculator;

