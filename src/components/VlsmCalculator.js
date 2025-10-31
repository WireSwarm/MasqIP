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
// Design agent: Sets a generous cap for slider layers while still keeping the UI manageable.
const MAX_LAYER_COUNT = 12;
// Design agent: Establishes the allowed CIDR range for slider interaction.
const MAX_SLIDER_PREFIX = 32;
const MIN_SLIDER_PREFIX = 0;
// Design agent: Defines magnetic breakpoints that help users land on popular CIDR boundaries.
const MAGNET_PREFIXES = [16, 24, 32];
// Design agent: Mirrors the slider gradient so list summaries can reuse layer colours.
const LAYER_PALETTE = ['var(--layer-color-a)', 'var(--layer-color-b)', 'var(--layer-color-c)', 'var(--layer-color-d)'];
// Design agent: Shares the network/host highlight colors with the inspector tooltip.
const CIDR_COLORS = { network: 'var(--layer-color-a)', host: 'var(--layer-host-color)' };

// Design agent: Splits a 32-bit address into its dotted-decimal octets.
const toOctets = (value) => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

// Design agent: Builds algebraic tokens that describe how each layer contributes to every octet.
const buildAddressFormulaOctets = (parsedSupernet, layers) => {
  if (!parsedSupernet) {
    return ['0', '0', '0', '0'];
  }
  const baseOctets = toOctets(parsedSupernet.network);
  const formulaTerms = baseOctets.map((value) => (value === 0 ? [] : [value.toString()]));

  layers.forEach((layer, index) => {
    const rawLabel = (layer.label ?? `Layer ${index + 1}`).trim();
    const label = rawLabel === '' ? `Layer ${index + 1}` : rawLabel;
    const blockSize = 2 ** (MAX_SLIDER_PREFIX - layer.prefix);
    const deltas = toOctets(blockSize);
    deltas.forEach((delta, octetIndex) => {
      if (delta === 0) {
        return;
      }
      const token = delta === 1 ? label : `${delta}×${label}`;
      formulaTerms[octetIndex].push(token);
    });
  });

  return formulaTerms.map((terms) => (terms.length === 0 ? '0' : terms.join(' + ')));
};

// Design agent: Maps each bit across the address to either the base network, a layer, or the host remainder.
const buildLayerBitPalette = (parsedSupernet, layers) => {
  const palette = new Array(MAX_SLIDER_PREFIX).fill(CIDR_COLORS.host);
  let cursor = 0;

  if (parsedSupernet) {
    const baseBits = Math.max(0, Math.min(MAX_SLIDER_PREFIX, parsedSupernet.prefix));
    for (let bit = 0; bit < baseBits; bit += 1) {
      palette[bit] = CIDR_COLORS.network;
    }
    cursor = Math.max(cursor, baseBits);
  }

  layers.forEach((layer, index) => {
    const targetPrefix = Math.max(0, Math.min(MAX_SLIDER_PREFIX, layer.prefix));
    const span = Math.max(0, targetPrefix - cursor);
    const colour = LAYER_PALETTE[index % LAYER_PALETTE.length];
    for (let bit = 0; bit < span; bit += 1) {
      const paletteIndex = cursor + bit;
      if (paletteIndex >= MAX_SLIDER_PREFIX) {
        break;
      }
      palette[paletteIndex] = colour;
    }
    cursor = Math.max(cursor, targetPrefix);
  });

  return palette;
};

// Design agent: Builds a text style that reflects the palette assigned to each bit within an octet.
const buildOctetGradientStyle = (bitSlice) => {
  if (bitSlice.length === 0) {
    return { color: CIDR_COLORS.host };
  }
  const firstColour = bitSlice[0];
  const isUniform = bitSlice.every((colour) => colour === firstColour);
  if (isUniform) {
    return { color: firstColour };
  }

  const stops = [];
  let segmentStart = 0;
  let currentColour = firstColour;

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

// Design agent: Produces coloured CIDR segments for an address-preview display.
const buildExampleSegments = (address, prefix) => {
  const octets = intToIpv4(address).split('.');
  const fullNetworkOctets = Math.floor(prefix / 8);
  const partialBits = prefix % 8;

  return octets.flatMap((octet, index) => {
    const segments = [];
    if (index < fullNetworkOctets) {
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: { color: CIDR_COLORS.network },
        role: 'network',
      });
    } else if (index === fullNetworkOctets && partialBits > 0) {
      const bitSlice = [];
      for (let bit = 0; bit < 8; bit += 1) {
        bitSlice.push(bit < partialBits ? CIDR_COLORS.network : CIDR_COLORS.host);
      }
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: buildOctetGradientStyle(bitSlice),
        role: 'mixed',
      });
    } else {
      segments.push({
        key: `octet-${index}`,
        value: octet,
        style: { color: CIDR_COLORS.host },
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

// Design agent: Applies the palette across octets so each layer colour remains visible in the formula.
const buildFormulaSegments = (octets, bitPalette) =>
  octets.map((octet, index) => {
    const trimmed = octet.length > 15 ? `${octet.slice(0, 15)}...` : octet;
    const start = index * 8;
    const slice = bitPalette ? bitPalette.slice(start, start + 8) : [];
    return {
      key: `formula-octet-${index}`,
      value: trimmed,
      style: buildOctetGradientStyle(slice),
    };
  });

// Design agent: Splits the formula across rows and reports layout metrics for responsive styling.
const buildFormulaRows = (segments) => {
  if (!segments || segments.length === 0) {
    return { rows: [], maxLength: 0 };
  }

  const totalLength = segments.reduce((sum, segment) => sum + segment.value.length, 0) + (segments.length - 1);
  const needsSplit = totalLength > 32;
  const groups = needsSplit ? [[0, 1], [2, 3]] : [[0, 1, 2, 3]];
  const rows = [];
  let longest = 0;

  groups.forEach((indices, groupIndex) => {
    if (!indices || indices.length === 0) {
      return;
    }
    const rowSegments = [];
    let rowLength = 0;
    indices.forEach((octetIndex, localIndex) => {
      const segment = segments[octetIndex];
      if (!segment) {
        return;
      }
      rowSegments.push(segment);
      rowLength += segment.value.length;
      const isLastOverall = octetIndex === segments.length - 1;
      const isLastInGroup = localIndex === indices.length - 1;
      if (!isLastOverall && (!isLastInGroup || groupIndex < groups.length - 1)) {
        rowSegments.push({
          key: `formula-dot-${octetIndex}`,
          value: '.',
          style: { color: 'inherit' },
        });
        rowLength += 1;
      }
    });
    if (rowSegments.length > 0) {
      rows.push(rowSegments);
      longest = Math.max(longest, rowLength);
    }
  });

  return { rows, maxLength: longest };
};

// Design agent: Normalises subnet rows to keep a single empty trailing entry with defaults.
const normaliseHostRows = (rows) => {
  const normalised = [];
  let hasTrailingEmpty = false;

  for (const row of rows) {
    const trimmedHosts = row.hosts.trim();
    // Design agent: Keep multiplier visually empty when not provided.
    const multiplier = row.multiplier.trim() === '' ? '' : row.multiplier;
    if (trimmedHosts === '') {
      if (!hasTrailingEmpty) {
        normalised.push({ hosts: '', multiplier: '' });
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
    normalised.push({ hosts: '', multiplier: '' });
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
  const normalisedHandles = handles
    .filter((handle) => handle && Number.isFinite(handle.prefix))
    .map((handle) => ({
      ...handle,
      prefix: Math.round(handle.prefix),
    }));

  if (normalisedHandles.length === 0) {
    return [];
  }

  const clipped = normalisedHandles.map((handle) => ({
    ...handle,
    prefix: Math.min(MAX_SLIDER_PREFIX, Math.max(handle.prefix, minimum)),
  }));

  const sorted = [...clipped].sort((a, b) => {
    if (a.prefix === b.prefix) {
      return a.id.localeCompare(b.id);
    }
    return a.prefix - b.prefix;
  });

  return sorted.slice(0, MAX_LAYER_COUNT);
};

// Design agent: Summarises the number of networks produced per layer and the remaining host pool.
const buildSliderPlan = (parsedSupernet, handles) => {
  const minPrefix = Math.min(MAX_SLIDER_PREFIX, Math.max(parsedSupernet.prefix, MIN_SLIDER_PREFIX));
  const orderedHandles = sanitiseHandles(handles, parsedSupernet.prefix);
  const layers = [];

  let previousPrefix = minPrefix;

  orderedHandles.forEach((handle, index) => {
    const bits = Math.max(0, handle.prefix - previousPrefix);
    const networkCount = 2 ** bits;
    const addressesPerNetwork = 2 ** (MAX_SLIDER_PREFIX - handle.prefix);
    layers.push({
      bits,
      prefix: handle.prefix,
      id: handle.id,
      index,
      label: handle.label ?? `Layer ${index + 1}`,
      networkCount,
      addressesPerNetwork,
    });
    previousPrefix = handle.prefix;
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
  // Design agent: Start with empty multiplier; treat blank as 1 internally, but do not prefill visually.
  const [hostInputs, setHostInputs] = useState([{ hosts: '', multiplier: '' }]);
  const [mode, setMode] = useState('method1');
  const [pathSupernet, setPathSupernet] = useState('');
  const handleIdRef = useRef(1);
  const [layerHandles, setLayerHandles] = useState([{ id: 'layer-0', prefix: 24, label: 'Layer 1' }]);
  // Design agent: Stores the selected network index per layer for the IP example helper.
  const [layerExampleInputs, setLayerExampleInputs] = useState(['1']);
  // Design agent: Tracks the host index requested in the IP example helper.
  const [exampleHostIndex, setExampleHostIndex] = useState('1');
  const [expandedGroups, setExpandedGroups] = useState([]);
  const inputRefs = useRef([]);

  // Design agent: Parses the supernet once for downstream consumers.
  const parsedSupernet = useMemo(() => parseCidr(pathSupernet), [pathSupernet]);

  // Design agent: Creates uniquely identified slider handles with a desired prefix.
  // Design agent: Generates uniquely identified handles while preserving user-friendly labels.
  const createHandle = (prefix, label) => {
    const id = `layer-${handleIdRef.current}`;
    handleIdRef.current += 1;
    return { id, prefix, label: label ?? `Layer ${handleIdRef.current}` };
  };

  // Design agent: Revalidates slider layers whenever the supernet changes.
  useEffect(() => {
    if (!parsedSupernet) {
      return;
    }
    setLayerHandles((previous) => {
      const sanitised = sanitiseHandles(previous, parsedSupernet.prefix);
      const ensured =
        sanitised.length === 0
          ? [
              createHandle(
                Math.min(MAX_SLIDER_PREFIX, Math.max(parsedSupernet.prefix, MIN_SLIDER_PREFIX)),
                'Layer 1',
              ),
            ]
          : sanitised;
      if (ensured.length !== previous.length) {
        return ensured;
      }
      for (let index = 0; index < ensured.length; index += 1) {
        const nextHandle = ensured[index];
        const previousHandle = previous[index];
        if (!previousHandle || previousHandle.id !== nextHandle.id || previousHandle.prefix !== nextHandle.prefix) {
          return ensured;
        }
      }
      return previous;
    });
  }, [parsedSupernet]);

  // Design agent: Keeps the IP example layer selections in sync with the slider layer count.
  useEffect(() => {
    setLayerExampleInputs((previous) => {
      const desiredLength = Math.max(0, layerHandles.length);
      if (desiredLength === previous.length) {
        return previous;
      }
      const trimmed = previous.slice(0, desiredLength);
      while (trimmed.length < desiredLength) {
        trimmed.push('1');
      }
      if (trimmed.length === previous.length && trimmed.every((value, index) => value === previous[index])) {
        return previous;
      }
      return trimmed;
    });
  }, [layerHandles.length]);

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

  // Design agent: Prepares the algebraic string used to describe the addressing pattern.
  const addressFormulaOctets = useMemo(() => {
    if (!methodTwoPlan || methodTwoPlan.error || methodTwoPlan.pending) {
      return null;
    }
    return buildAddressFormulaOctets(methodTwoPlan.parsedBase, methodTwoPlan.layers);
  }, [methodTwoPlan]);

  // Design agent: Mirrors layer ownership across the 32-bit palette for styling.
  const addressFormulaPalette = useMemo(() => {
    if (!methodTwoPlan || methodTwoPlan.error || methodTwoPlan.pending) {
      return null;
    }
    return buildLayerBitPalette(methodTwoPlan.parsedBase, methodTwoPlan.layers);
  }, [methodTwoPlan]);

  // Design agent: Converts the algebraic octets into coloured CIDR segments.
  const addressFormulaSegments = useMemo(() => {
    if (!addressFormulaOctets) {
      return [];
    }
    return buildFormulaSegments(addressFormulaOctets, addressFormulaPalette ?? []);
  }, [addressFormulaOctets, addressFormulaPalette]);

  // Design agent: Provides pre-split rows for responsive rendering.
  const addressFormulaLayout = useMemo(() => buildFormulaRows(addressFormulaSegments), [addressFormulaSegments]);
  const addressFormulaRows = addressFormulaLayout.rows;

  // Design agent: Chooses a comfortable font size based on the widest formula row.
  const addressFormulaFontSize = useMemo(() => {
    const length = addressFormulaLayout.maxLength || 0;
    if (length <= 28) {
      return '1.1rem';
    }
    if (length <= 36) {
      return '1rem';
    }
    if (length <= 44) {
      return '0.94rem';
    }
    return '0.88rem';
  }, [addressFormulaLayout]);

  // Design agent: Evaluates the concrete IP example based on layer and host selections.
  const exampleAnalysis = useMemo(() => {
    if (!methodTwoPlan || methodTwoPlan.error || methodTwoPlan.pending) {
      return null;
    }

    const layers = methodTwoPlan.layers;
    const selections = layers.map((layer, index) => {
      const raw = layerExampleInputs[index] ?? '';
      const parsed = Number(raw);
      if (Number.isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return Math.min(parsed, layer.networkCount);
    });

    const hostCapacity =
      layers.length > 0 ? layers[layers.length - 1].addressesPerNetwork : methodTwoPlan.host.hostAddresses;
    const rawHost = Number(exampleHostIndex);
    const clampedHost = Number.isNaN(rawHost) || rawHost < 1 ? 1 : Math.min(rawHost, hostCapacity);

    let address = methodTwoPlan.parsedBase.network;
    const layerSummaries = [];

    selections.forEach((selection, index) => {
      const layer = layers[index];
      if (!layer) {
        return;
      }
      const blockSize = 2 ** (MAX_SLIDER_PREFIX - layer.prefix);
      const increment = (selection - 1) * blockSize;
      address += increment;
      layerSummaries.push({
        selection,
        prefix: layer.prefix,
        networkAddress: address,
        formattedNetwork: intToIpv4(address),
      });
    });

    const networkAddress = address;
    const finalPrefix = layers.length > 0 ? layers[layers.length - 1].prefix : methodTwoPlan.host.prefix;
    const hostAddress = networkAddress + Math.max(0, clampedHost - 1);

    return {
      networkAddress,
      networkPrefix: finalPrefix,
      hostAddress,
      hostIndex: clampedHost,
      layerSummaries,
      hostCapacity,
    };
  }, [exampleHostIndex, layerExampleInputs, methodTwoPlan]);

  // Design agent: Produces coloured segments for the resolved example address.
const exampleDisplaySegments = useMemo(() => {
  if (!exampleAnalysis) {
    return [];
  }
  return buildExampleSegments(exampleAnalysis.hostAddress, exampleAnalysis.networkPrefix);
}, [exampleAnalysis]);

// Design agent: Extracts concise KPIs for the refreshed method two metrics panel.
// Design agent: Key Metrics removed per requirements.

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
      focusHostField(index - 1);
    }
  };

  // Design agent: Updates the supernet used in method 2.
  const handleSupernetChange = (event) => {
    setPathSupernet(event.target.value);
  };

  // Design agent: Applies slider movements to a given layer handle.
  const handleLayerChange = (handleId, nextValue) => {
    setLayerHandles((prev) => {
      const basePrefix = parsedSupernet ? parsedSupernet.prefix : MIN_SLIDER_PREFIX;
      const updated = prev.map((handle) =>
        handle.id === handleId
          ? {
              ...handle,
              prefix: nextValue,
            }
          : handle,
      );
      const sanitised = sanitiseHandles(updated, basePrefix);
      if (sanitised.length === 0) {
        return [createHandle(Math.min(MAX_SLIDER_PREFIX, Math.max(basePrefix, MIN_SLIDER_PREFIX)), 'Layer 1')];
      }
      return sanitised;
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
      const lastHandle = sanitised[sanitised.length - 1];
      const lastPrefix = lastHandle ? lastHandle.prefix : Math.max(basePrefix, MIN_SLIDER_PREFIX);
      const availableHeadroom = Math.max(0, MAX_SLIDER_PREFIX - lastPrefix);
      const proposedOffset = Math.max(1, Math.ceil(availableHeadroom / 2));
      const proposedPrefix = Math.min(MAX_SLIDER_PREFIX, lastPrefix + proposedOffset);
      const nextLabel = `Layer ${sanitised.length + 1}`;
      const nextHandles = [...sanitised, createHandle(proposedPrefix, nextLabel)];
      return sanitiseHandles(nextHandles, basePrefix);
    });
  };

  // Design agent: Drops the last layer when the user requests a simplification.
  const handleRemoveLayer = () => {
    setLayerHandles((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const basePrefix = parsedSupernet ? parsedSupernet.prefix : MIN_SLIDER_PREFIX;
      const trimmed = [...prev].sort((a, b) => a.prefix - b.prefix).slice(0, -1);
      return sanitiseHandles(trimmed, basePrefix);
    });
  };

  // Design agent: Records live edits to the label associated with a specific layer.
  const handleLayerLabelChange = (handleId, rawValue) => {
    const sanitised = rawValue.replace(/\s+/g, ' ').slice(0, 40);
    setLayerHandles((prev) =>
      prev.map((handle) =>
        handle.id === handleId
          ? {
              ...handle,
              label: sanitised,
            }
          : handle,
      ),
    );
  };

  // Design agent: Ensures empty labels fall back to a readable default.
  const handleLayerLabelBlur = (handleId) => {
    setLayerHandles((prev) => {
      const index = prev.findIndex((handle) => handle.id === handleId);
      if (index === -1) {
        return prev;
      }
      const current = prev[index];
      const trimmed = (current.label ?? '').trim();
      if (trimmed === current.label && trimmed !== '') {
        return prev;
      }
      const next = [...prev];
      next[index] = {
        ...current,
        label: trimmed === '' ? `Layer ${index + 1}` : trimmed,
      };
      return next;
    });
  };

  // Design agent: Updates the requested network index for a specific layer example.
  const handleExampleLayerChange = (index, rawValue) => {
    const digits = rawValue.replace(/[^\d]/g, '');
    setLayerExampleInputs((prev) => {
      const next = [...prev];
      next[index] = digits;
      return next;
    });
  };

  // Design agent: Stores the requested host index while allowing the user to clear the field.
  const handleExampleHostChange = (rawValue) => {
    const digits = rawValue.replace(/[^\d]/g, '');
    setExampleHostIndex(digits);
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
                                <li key={instanceIndex} className="result-subitem" id={`method1-subnet-${index}-${instanceIndex}`}>
                                  <span className="result-title" id={`method1-subnet-title-${index}-${instanceIndex}`}>
                                    Plan {instanceIndex + 1}: {intToIpv4(allocation.network)}/{allocation.prefix}
                                  </span>
                                  <span className="result-meta" id={`method1-subnet-meta-${index}-${instanceIndex}`}>
                                    Range {intToIpv4(allocation.network)} - {intToIpv4(allocation.broadcast)} · mask {formatMask(maskFromPrefix(allocation.prefix))}
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
                <div className="result-subheading result-subheading--formula">Address format</div>
                {addressFormulaRows.length === 0 ? (
                  <p className="result-meta muted formula-placeholder">Adjust the slider to generate a readable formula.</p>
                ) : (
                  <div
                    className="cidr-display cidr-display--formula"
                    aria-label="Address format"
                    style={{ '--formula-font-size': addressFormulaFontSize }}
                  >
                    <span className="cidr-prefix">Formula</span>
                    <div className="cidr-octets">
                      {addressFormulaRows.map((row, rowIndex) => (
                        <span key={`formula-row-${rowIndex}`} className="cidr-row">
                          {row.map((segment) => (
                            <span key={segment.key} className="cidr-segment" style={segment.style}>
                              {segment.value}
                            </span>
                          ))}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="result-note">
                  IPv6 readability tip: keep decisive half-octets outside the mask so each hexadecimal character
                  remains visible.
                </p>
                {/* Design agent: Remove Key Metrics section as requested and surface the layer breakdown before exploration tools. */}
                <div className="result-subheading" id="method-two-layer-breakdown-heading">
                  Layer breakdown
                </div>
                <ul className="result-list compact" id="method-two-layer-breakdown">
                  {methodTwoPlan.layers.map((layer) => {
                    const layerColour = LAYER_PALETTE[layer.index % LAYER_PALETTE.length];
                    const isReadable = layer.prefix % 8 === 0;
                    const exampleSummary = exampleAnalysis?.layerSummaries?.[layer.index];
                    const layerLabelValue = layer.label ?? '';
                    const trimmedLayerLabel = layerLabelValue.trim();
                    const fallbackLayerLabel = `Layer ${layer.index + 1}`;
                    const readableLayerLabel = trimmedLayerLabel === '' ? fallbackLayerLabel : trimmedLayerLabel;
                    return (
                      <li key={layer.id} className="result-item layer-result-item">
                        <div className="layer-result-header">
                          <span className="layer-colour-chip" style={{ backgroundColor: layerColour }} />
                          <input
                            type="text"
                            value={layerLabelValue}
                            onChange={(event) => handleLayerLabelChange(layer.id, event.target.value)}
                            onBlur={() => handleLayerLabelBlur(layer.id)}
                            className="result-title result-title-input"
                            aria-label={`Rename ${readableLayerLabel}`}
                            placeholder={fallbackLayerLabel}
                          />
                          <span className={`readable-tag ${isReadable ? 'is-readable' : 'is-unreadable'}`}>
                            Readable: {isReadable ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {/* Design agent: result-meta removed per requirements. */}
                      </li>
                    );
                  })}
                </ul>
                {/* Design agent: Address Explorer follows the breakdown for contextual flow. */}
                <details className="ip-examples" id="method-two-address-explorer">
                  <summary id="method-two-address-explorer-summary">Address explorer</summary>
                  <div className="ip-examples-body">
                    <p className="ip-examples-intro">
                      Choose network indices per layer and optionally a host index to preview the resulting address.
                    </p>
                    <div className="ip-examples-grid">
                      {methodTwoPlan.layers.map((layer, index) => {
                        const value = layerExampleInputs[index] ?? '';
                        const exampleSummary = exampleAnalysis?.layerSummaries?.[index];
                        const displayLabel =
                          layer.label && layer.label.trim() !== '' ? layer.label.trim() : `Layer ${index + 1}`;
                        return (
                          <label key={layer.id} className="field ip-examples-field">
                            <span>
                              {displayLabel} network{' '}
                              <span
                                className="layer-colour-chip inline"
                                style={{ backgroundColor: LAYER_PALETTE[index % LAYER_PALETTE.length] }}
                              />
                            </span>
                            <input
                              value={value}
                              onChange={(event) => handleExampleLayerChange(index, event.target.value)}
                              placeholder="e.g. 5"
                              className="field-input"
                              inputMode="numeric"
                              aria-describedby={`layer-${layer.id}-hint`}
                            />
                            <span id={`layer-${layer.id}-hint`} className="field-hint">
                              Up to {layer.networkCount.toLocaleString()} networks
                            </span>
                            {exampleSummary && (
                              <span className="field-hint">
                                Resolves to {exampleSummary.formattedNetwork}/{layer.prefix}
                              </span>
                            )}
                          </label>
                        );
                      })}
                      <label className="field ip-examples-field">
                        <span>Host index</span>
                        <input
                          value={exampleHostIndex}
                          onChange={(event) => handleExampleHostChange(event.target.value)}
                          placeholder="e.g. 23"
                          className="field-input"
                          inputMode="numeric"
                          aria-describedby="host-index-hint"
                        />
                        <span id="host-index-hint" className="field-hint">
                          Up to {methodTwoPlan.host.hostAddresses.toLocaleString()} addresses
                        </span>
                      </label>
                    </div>
                    {exampleAnalysis && (
                      <div className="ip-examples-result">
                        <div className="cidr-display" aria-label="Resolved example address">
                          <span className="cidr-prefix">Result</span>
                          <span className="cidr-octets">
                            {exampleDisplaySegments.map((segment) => (
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
                          <span className="cidr-segment" style={{ color: CIDR_COLORS.network }}>
                            {exampleAnalysis.networkPrefix}
                          </span>
                        </div>
                        <p className="result-meta">
                          Host #{exampleAnalysis.hostIndex.toLocaleString()} within network{' '}
                          {intToIpv4(exampleAnalysis.networkAddress)}/{exampleAnalysis.networkPrefix}
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default VlsmCalculator;
// Design agent: Also export named for import flexibility and IDE refactors.
export { VlsmCalculator };










