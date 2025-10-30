import { useEffect, useMemo, useRef, useState } from 'react';
import {
  alignToBlock,
  formatMask,
  getTotalAddressCount,
  getUsableHostCount,
  intToIpv4,
  parseCidr,
} from '../utils/ipMath';
import HierarchicalSlider from './HierarchicalSlider';

const MAX_SUBNET_FIELDS = 16;
const MAX_MULTIPLIER = 64;
// Design agent: Limits the number of slider-driven layers to the available colour palette.
const MAX_LAYER_COUNT = 4;
// Design agent: Establishes the allowed CIDR range for slider interaction.
const MAX_SLIDER_PREFIX = 32;
const MIN_SLIDER_PREFIX = 8;
// Design agent: Defines magnetic breakpoints that help users land on popular CIDR boundaries.
const MAGNET_PREFIXES = [16, 24, 32];

// Design agent: Normalises subnet rows to keep a single empty trailing entry with defaults.
const normaliseHostRows = (rows) => {
  const normalised = [];
  let hasTrailingEmpty = false;

  for (const row of rows) {
    const trimmedHosts = row.hosts.trim();
    const multiplier = row.multiplier.trim() === '' ? '1' : row.multiplier;
    if (trimmedHosts === '') {
      if (!hasTrailingEmpty) {
        normalised.push({ hosts: '', multiplier: '1' });
        hasTrailingEmpty = true;
      }
    } else {
      normalised.push({ hosts: row.hosts, multiplier });
      hasTrailingEmpty = false;
    }
    if (normalised.length === MAX_SUBNET_FIELDS) {
      break;
    }
  }

  if (!hasTrailingEmpty && normalised.length < MAX_SUBNET_FIELDS) {
    normalised.push({ hosts: '', multiplier: '1' });
  }

  return normalised;
};

// Design agent: Produces a mask integer from a CIDR prefix length.
const maskFromPrefix = (prefix) => {
  if (prefix === 0) {
    return 0;
  }
  return (~0 << (32 - prefix)) >>> 0;
};

// Design agent: Keeps layer handles ordered and within the valid slider range.
const sanitiseHandles = (handles, basePrefix) => {
  const minimum = Math.min(MAX_SLIDER_PREFIX, Math.max(basePrefix, MIN_SLIDER_PREFIX));
  const sorted = handles
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.round(value))
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    const fallback = Math.min(MAX_SLIDER_PREFIX, Math.max(24, minimum));
    return [fallback];
  }

  const result = [];
  let cursor = minimum;

  for (const value of sorted) {
    const clamped = Math.min(MAX_SLIDER_PREFIX, Math.max(value, cursor));
    result.push(clamped);
    cursor = clamped;
    if (result.length === MAX_LAYER_COUNT) {
      break;
    }
  }

  return result;
};

// Design agent: Summarises the number of networks produced per layer and the remaining host pool.
const buildSliderPlan = (parsedSupernet, handles) => {
  const minPrefix = Math.min(MAX_SLIDER_PREFIX, Math.max(parsedSupernet.prefix, MIN_SLIDER_PREFIX));
  const orderedHandles = sanitiseHandles(handles, parsedSupernet.prefix);
  const layers = [];

  let previousPrefix = minPrefix;

  orderedHandles.forEach((prefix, index) => {
    const bits = Math.max(0, prefix - previousPrefix);
    const networkCount = 2 ** bits;
    const addressesPerNetwork = 2 ** (MAX_SLIDER_PREFIX - prefix);
    layers.push({
      bits,
      prefix,
      index,
      networkCount,
      addressesPerNetwork,
    });
    previousPrefix = prefix;
  });

  const hostBits = Math.max(0, MAX_SLIDER_PREFIX - previousPrefix);
  const hostAddresses = 2 ** hostBits;
  const hostUsable = hostBits >= 2 ? Math.max(0, hostAddresses - 2) : hostAddresses;

  return {
    orderedHandles,
    basePrefix: minPrefix,
    layers,
    host: {
      prefix: previousPrefix,
      hostBits,
      hostAddresses,
      hostUsable,
    },
  };
};

// Design agent: Implements hierarchical IPv4 planning with multiplier support and path-based schemes.
function VlsmCalculator() {
  const [baseNetwork, setBaseNetwork] = useState('');
  const [hostInputs, setHostInputs] = useState([{ hosts: '', multiplier: '1' }]);
  const [mode, setMode] = useState('method1');
  const [pathSupernet, setPathSupernet] = useState('');
  const [layerHandles, setLayerHandles] = useState([24]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const inputRefs = useRef([]);

  // Design agent: Parses the supernet once for downstream consumers.
  const parsedSupernet = useMemo(() => parseCidr(pathSupernet), [pathSupernet]);

  // Design agent: Revalidates slider layers whenever the supernet changes.
  useEffect(() => {
    if (!parsedSupernet) {
      return;
    }
    setLayerHandles((previous) => {
      const sanitised = sanitiseHandles(previous, parsedSupernet.prefix);
      if (sanitised.length !== previous.length || sanitised.some((value, index) => value !== previous[index])) {
        return sanitised;
      }
      return previous;
    });
  }, [parsedSupernet]);

  // Design agent: Focuses a subnet host field and places the caret at the end.
  const focusHostField = (index) => {
    queueMicrotask(() => {
      const element = inputRefs.current[index];
      if (element) {
        const length = element.value.length;
        element.focus();
        element.setSelectionRange(length, length);
      }
    });
  };

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

  // Design agent: Computes addressing plans derived from the slider-based hierarchy.
  const methodTwoPlan = useMemo(() => {
    if (pathSupernet.trim() === '') {
      return { pending: true };
    }

    if (!parsedSupernet) {
      return { error: 'Invalid supernet (use format x.x.x.x/yy).' };
    }

    if (parsedSupernet.prefix < MIN_SLIDER_PREFIX) {
      return { error: `Supernet prefix must be at least /${MIN_SLIDER_PREFIX}.` };
    }

    const sliderPlan = buildSliderPlan(parsedSupernet, layerHandles);

    return {
      parsedBase: parsedSupernet,
      ...sliderPlan,
    };
  }, [layerHandles, pathSupernet, parsedSupernet]);

  // Design agent: Provides reliable slider props even while the plan is pending or invalid.
  const sliderPreview = useMemo(() => {
    const fallbackPrefix = parsedSupernet ? parsedSupernet.prefix : MIN_SLIDER_PREFIX;
    const basePrefix = methodTwoPlan?.basePrefix ?? Math.min(MAX_SLIDER_PREFIX, Math.max(fallbackPrefix, MIN_SLIDER_PREFIX));
    const handles = methodTwoPlan?.orderedHandles ?? sanitiseHandles(layerHandles, fallbackPrefix);
    return {
      basePrefix,
      handles,
    };
  }, [layerHandles, methodTwoPlan, parsedSupernet]);

  // Design agent: Updates the base network input for method 1.
  const handleBaseChange = (event) => {
    setBaseNetwork(event.target.value);
  };

  // Design agent: Switches between the two planning methods.
  const handleModeChange = (nextMode) => {
    setMode(nextMode);
  };

  // Design agent: Stores edits for host counts and multipliers.
  const handleHostChange = (index, field, value) => {
    setHostInputs((prev) => {
      const next = [...prev];
      const safeValue = field === 'multiplier' && value.trim() === '' ? '' : value;
      next[index] = { ...next[index], [field]: safeValue };
      return normaliseHostRows(next);
    });
  };

  // Design agent: Toggles whether a subnet group's allocations are expanded.
  const toggleGroupExpansion = (index) => {
    setExpandedGroups((prev) => {
      if (prev.includes(index)) {
        return prev.filter((value) => value !== index);
      }
      return [...prev, index];
    });
  };

  // Design agent: Provides keyboard navigation for subnet fields.
  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, hostInputs.length - 1);
      focusHostField(nextIndex);
      return;
    }

    if (event.key === 'Backspace' && hostInputs[index].hosts === '' && index > 0) {
      event.preventDefault();
      const previousIndex = index - 1;
      setHostInputs((prev) => {
        const next = [...prev];
        const previousRow = next[previousIndex] ?? { hosts: '', multiplier: '1' };
        next[previousIndex] = {
          ...previousRow,
          hosts: previousRow.hosts.slice(0, -1),
        };
        return normaliseHostRows(next);
      });
      focusHostField(previousIndex);
    }
  };

  // Design agent: Updates the supernet used in method 2.
  const handleSupernetChange = (event) => {
    setPathSupernet(event.target.value);
  };

  // Design agent: Applies slider movements to a given layer handle.
  const handleLayerChange = (index, nextValue) => {
    setLayerHandles((prev) => {
      const draft = [...prev];
      draft[index] = nextValue;
      if (!parsedSupernet) {
        return sanitiseHandles(draft, MIN_SLIDER_PREFIX);
      }
      return sanitiseHandles(draft, parsedSupernet.prefix);
    });
  };

  // Design agent: Inserts a new intermediate layer at a balanced position.
  const handleAddLayer = () => {
    setLayerHandles((prev) => {
      if (prev.length >= MAX_LAYER_COUNT) {
        return prev;
      }
      const basePrefix = parsedSupernet ? parsedSupernet.prefix : MIN_SLIDER_PREFIX;
      const sanitised = sanitiseHandles(prev, basePrefix);
      const last = sanitised[sanitised.length - 1] ?? Math.max(basePrefix, MIN_SLIDER_PREFIX);
      const gap = Math.max(1, Math.floor((MAX_SLIDER_PREFIX - last) / 2));
      const proposed = Math.min(MAX_SLIDER_PREFIX, last + gap);
      return sanitiseHandles([...sanitised, proposed], basePrefix);
    });
  };

  // Design agent: Drops the last layer when the user requests a simplification.
  const handleRemoveLayer = () => {
    setLayerHandles((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.slice(0, -1);
    });
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
                      {(() => {
                        const allocations = group.allocations;
                        const isExpanded = expandedGroups.includes(index);
                        const visibleAllocations = isExpanded ? allocations : allocations.slice(0, 4);
                        const hasHiddenAllocations = allocations.length > visibleAllocations.length;

                        if (allocations.length === 0) {
                          return <span className="result-title muted">Awaiting size…</span>;
                        }

                        return (
                          <>
                            <span className="result-title">
                              Subnet group {index + 1} ({allocations.length}×)
                            </span>
                            <ul className="result-sublist">
                              {visibleAllocations.map((allocation, instanceIndex) => (
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
                            {hasHiddenAllocations && (
                              <button
                                type="button"
                                className="ghost-button expand-button"
                                onClick={() => toggleGroupExpansion(index)}
                              >
                                {isExpanded
                                  ? 'Show fewer plans'
                                  : `Show all ${allocations.length.toLocaleString()} plans`}
                              </button>
                            )}
                          </>
                        );
                      })()}
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

          <HierarchicalSlider
            supernetPrefix={sliderPreview.basePrefix}
            handles={sliderPreview.handles}
            magnets={MAGNET_PREFIXES}
            onHandleChange={handleLayerChange}
            onAddLayer={handleAddLayer}
            onRemoveLayer={handleRemoveLayer}
            canAdd={layerHandles.length < MAX_LAYER_COUNT}
            canRemove={layerHandles.length > 1}
            disabled={!parsedSupernet || Boolean(methodTwoPlan.error)}
          />

          <div className="result-card">
            {methodTwoPlan.error ? (
              <p className="error-text">{methodTwoPlan.error}</p>
            ) : methodTwoPlan.pending ? (
              <p className="result-summary">
                Start by selecting a supernet, then drag the sliders to carve your addressing layers.
              </p>
            ) : (
              <>
                <p className="result-summary">
                  Supernet: {intToIpv4(methodTwoPlan.parsedBase.network)}/{methodTwoPlan.parsedBase.prefix} · host
                  remainder /{methodTwoPlan.host.prefix}
                </p>
                <p className="result-summary">
                  Host pool keeps {methodTwoPlan.host.hostBits} bit
                  {methodTwoPlan.host.hostBits === 1 ? '' : 's'} (
                  {methodTwoPlan.host.hostAddresses.toLocaleString()} addresses ·{' '}
                  {methodTwoPlan.host.hostUsable.toLocaleString()} usable).
                </p>
                <ul className="result-list compact">
                  {methodTwoPlan.layers.map((layer) => (
                    <li key={layer.index} className="result-item">
                      <span className="result-title">Layer {layer.index + 1}</span>
                      <span className="result-meta">
                        /{layer.prefix} · {layer.bits} bit{layer.bits === 1 ? '' : 's'} ·{' '}
                        {layer.networkCount.toLocaleString()} network{layer.networkCount === 1 ? '' : 's'} ×{' '}
                        {layer.addressesPerNetwork.toLocaleString()} addresses
                      </span>
                    </li>
                  ))}
                  <li className="result-item">
                    <span className="result-title">Host allocation</span>
                    <span className="result-meta">
                      Remainder /{methodTwoPlan.host.prefix} ·{' '}
                      {methodTwoPlan.host.hostAddresses.toLocaleString()} addresses (
                      {methodTwoPlan.host.hostUsable.toLocaleString()} usable)
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
