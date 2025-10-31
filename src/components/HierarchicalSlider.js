import { useEffect, useMemo, useRef, useState } from 'react';
import './HierarchicalSlider.css';

const TRACK_MAX_PREFIX = 32;
const LAYER_COLORS = [
  'var(--layer-color-a)',
  'var(--layer-color-b)',
  'var(--layer-color-c)',
  'var(--layer-color-d)',
];
// Design agent: Converts a CIDR prefix into a percentage along the slider track.
const prefixToPercent = (prefix, supernetPrefix) => {
  const range = Math.max(0.0001, TRACK_MAX_PREFIX - supernetPrefix);
  return ((prefix - supernetPrefix) / range) * 100;
};

// Design agent: Retrieves a handle descriptor by id in a robust way.
const getHandleById = (handles, id) => handles.find((handle) => handle.id === id);

// Design agent: Produces the prefix that should paint the track for a handle, preferring live drag data.
const resolvePaintPrefix = (handle, dragState, supernetPrefix) => {
  if (!dragState || dragState.id !== handle.id) {
    return handle.prefix;
  }
  return Math.min(TRACK_MAX_PREFIX, Math.max(supernetPrefix, dragState.visualPrefix));
};

// Design agent: Renders a multi-handle slider that maps CIDR prefixes to coloured segments.
function HierarchicalSlider({
  supernetPrefix,
  handles = [],
  magnets,
  onHandleChange,
  onAddLayer,
  onRemoveLayer,
  canAdd,
  canRemove,
  disabled,
}) {
  const railRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  // Design agent: Maintains live hover tooltip metadata for network availability feedback.
  const [hoverState, setHoverState] = useState({
    isVisible: false,
    x: 0,
    y: 0,
    label: '',
  });

  // Design agent: Ensures magnet anchors stay ordered for predictable snapping.
  const magnetPoints = useMemo(() => {
    if (!magnets || magnets.length === 0) {
      return [];
    }
    return [...magnets].sort((a, b) => a - b);
  }, [magnets]);

  // Design agent: Builds logical segments so the hover tooltip can expose network and host counts.
  const segmentMetrics = useMemo(() => {
    const range = Math.max(0.0001, TRACK_MAX_PREFIX - supernetPrefix);
    const segments = [];
    const paintSegments = [];
    const sorted = [...handles].sort((a, b) => a.prefix - b.prefix);
    let previousPrefix = supernetPrefix;
    let previousPercent = 0;

    sorted.forEach((handle, index) => {
      const paintPrefix = resolvePaintPrefix(handle, dragState, supernetPrefix);
      const boundedPrefix = Math.min(TRACK_MAX_PREFIX, Math.max(previousPrefix, paintPrefix));
      const bits = Math.max(0, boundedPrefix - previousPrefix);
      const nextPercent = Math.max(previousPercent, ((boundedPrefix - supernetPrefix) / range) * 100);
      const rawLabel = handle.label ? handle.label.trim() : '';
      const label = rawLabel !== '' ? rawLabel : `Layer ${index + 1}`;
      const segmentStart = previousPercent;
      const segmentEnd = Math.min(100, nextPercent);
      segments.push({
        type: 'layer',
        id: handle.id,
        index,
        label,
        startPercent: previousPercent,
        endPercent: segmentEnd,
        networkCount: Math.max(1, 2 ** bits),
      });
      paintSegments.push({
        id: handle.id,
        color: LAYER_COLORS[index % LAYER_COLORS.length],
        startPercent: segmentStart,
        endPercent: segmentEnd,
      });
      previousPrefix = boundedPrefix;
      previousPercent = nextPercent;
    });

    const remainderBits = Math.max(0, TRACK_MAX_PREFIX - previousPrefix);
    const hostAddresses = Math.max(1, 2 ** remainderBits);
    segments.push({
      type: 'host',
      startPercent: previousPercent,
      endPercent: 100,
      hostAddresses,
    });

    return { range, segments, paintSegments };
  }, [dragState, handles, supernetPrefix]);

  // Design agent: Builds tick marks that highlight key CIDR checkpoints.
  const scaleMarks = useMemo(() => {
    const marks = new Set([Math.round(supernetPrefix), TRACK_MAX_PREFIX]);
    magnetPoints.forEach((point) => {
      if (point >= supernetPrefix && point <= TRACK_MAX_PREFIX) {
        marks.add(Math.round(point));
      }
    });
    return [...marks].sort((a, b) => a - b);
  }, [magnetPoints, supernetPrefix]);

  // Design agent: Handles pointer movement for draggable slider handles.
  useEffect(() => {
    if (!dragState || disabled) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      if (!railRef.current) {
        return;
      }

      const rect = railRef.current.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const relative = (event.clientX - rect.left) / rect.width;
      const clampedRatio = Math.min(1, Math.max(0, relative));
      const rawPrefix = supernetPrefix + clampedRatio * (TRACK_MAX_PREFIX - supernetPrefix);

      const now = event.timeStamp || performance.now();
      const elapsed = Math.max(1, now - dragState.lastTime);
      const delta = Math.abs(rawPrefix - dragState.visualPrefix);
      const speed = (delta / elapsed) * 1000;
      const baseThreshold = Math.max(0.04, (speed ** 1.15) * 0.1);
      const slowReduction = speed < 0.85 ? (0.85 - speed) * 0.32 : 0;
      const magnetThreshold = Math.min(1.5, Math.max(0.04, baseThreshold - slowReduction));

      let candidate = rawPrefix;
      if (magnetPoints.length > 0) {
        let snapped = candidate;
        let closest = magnetThreshold + 1;
        magnetPoints.forEach((point) => {
          const distance = Math.abs(point - candidate);
          if (distance <= magnetThreshold && distance < closest) {
            snapped = point;
            closest = distance;
          }
        });
        candidate = snapped;
      }

      const bounded = Math.min(TRACK_MAX_PREFIX, Math.max(supernetPrefix, candidate));
      const rounded = Math.round(bounded);

      if (rounded !== dragState.lastReportedPrefix) {
        onHandleChange(dragState.id, rounded);
      }

      setDragState((previous) => {
        if (!previous || previous.id !== dragState.id) {
          return previous;
        }
        return {
          ...previous,
          visualPrefix: bounded,
          lastTime: now,
          lastReportedPrefix: rounded,
        };
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [disabled, dragState, magnetPoints, onHandleChange, supernetPrefix]);

  // Design agent: Maintains handle ordering for consistent layout.
  const sortedHandles = useMemo(
    () => [...handles].sort((a, b) => a.prefix - b.prefix),
    [handles],
  );

  // Design agent: Captures pointer input and initialises dragging metadata.
  const beginDrag = (event, handle) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    const handleRecord = getHandleById(handles, handle.id);
    const handlePrefix = handleRecord ? handleRecord.prefix : handle.prefix;
    setDragState({
      id: handle.id,
      visualPrefix: handlePrefix,
      lastReportedPrefix: handlePrefix,
      lastTime: event.timeStamp || performance.now(),
    });
  };

  // Design agent: Computes the tooltip text and coordinates while hovering over the slider rail.
  const handleRailHover = (event) => {
    if (!railRef.current || disabled) {
      setHoverState((previous) =>
        previous.isVisible
          ? {
              ...previous,
              isVisible: false,
            }
          : previous,
      );
      return;
    }
    const rect = railRef.current.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const relativeX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const ratioPercent = rect.width === 0 ? 0 : (relativeX / rect.width) * 100;
    const segment = segmentMetrics.segments.find(
      (candidate) => ratioPercent >= candidate.startPercent && ratioPercent <= candidate.endPercent,
    );
    if (!segment) {
      setHoverState((previous) =>
        previous.isVisible
          ? {
              ...previous,
              isVisible: false,
            }
          : previous,
      );
      return;
    }
    let label;
    if (segment.type === 'layer') {
      label = `${segment.label}: ${segment.networkCount.toLocaleString()} network${
        segment.networkCount === 1 ? '' : 's'
      }`;
    } else {
      label = `Host pool: ${segment.hostAddresses.toLocaleString()} available hosts`;
    }
    setHoverState({
      isVisible: true,
      x: relativeX,
      y: rect.height / 2,
      label,
    });
  };

  // Design agent: Hides the tooltip when the pointer exits the slider rail.
  const handleRailLeave = () => {
    setHoverState((previous) =>
      previous.isVisible
        ? {
            ...previous,
            isVisible: false,
          }
        : previous,
    );
  };

  // Design agent: Prevents stale tooltips from lingering when the slider is disabled.
  useEffect(() => {
    if (!disabled) {
      return;
    }
    setHoverState((previous) =>
      previous.isVisible
        ? {
            ...previous,
            isVisible: false,
          }
        : previous,
    );
  }, [disabled]);

  return (
    <div className={`hierarchical-slider${disabled ? ' is-disabled' : ''}`}>
      <div className="slider-toolbar">
        <span className="slider-title">Layer distribution</span>
        <div className="slider-actions">
          <button
            type="button"
            className={`ghost-button slider-button${canRemove ? '' : ' slider-button--placeholder'}`}
            onClick={onRemoveLayer}
            disabled={!canRemove || disabled}
            aria-label="Remove last layer"
            aria-hidden={canRemove ? undefined : true}
            tabIndex={canRemove ? 0 : -1}
          >
            –
          </button>
          <button
            type="button"
            className="ghost-button slider-button"
            onClick={onAddLayer}
            disabled={!canAdd || disabled}
            aria-label="Add layer"
          >
            +
          </button>
        </div>
      </div>
      <div className="slider-track">
        <div className="slider-rail">
          <div
            className="slider-rail-track"
            ref={railRef}
            onMouseMove={handleRailHover}
            onMouseEnter={handleRailHover}
            onMouseLeave={handleRailLeave}
          >
            <div className="slider-track-fill">
              {segmentMetrics.paintSegments.map((segment) => {
                const widthPercent = Math.max(0, segment.endPercent - segment.startPercent);
                return (
                  <div
                    key={`paint-${segment.id}`}
                    className="slider-track-segment"
                    style={{
                      left: `${segment.startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                );
              })}
            </div>
            <div className="slider-track-overlay" />
            {sortedHandles.map((handle, index) => {
              const trimmedLabel = handle.label ? handle.label.trim() : '';
              const handleLabel = trimmedLabel !== '' ? trimmedLabel : `Layer ${index + 1}`;
              const activePercent =
                dragState && dragState.id === handle.id
                  ? prefixToPercent(dragState.visualPrefix, supernetPrefix)
                  : prefixToPercent(handle.prefix, supernetPrefix);
              const activeLabel =
                dragState && dragState.id === handle.id
                  ? Math.round(Math.min(TRACK_MAX_PREFIX, Math.max(supernetPrefix, dragState.visualPrefix)))
                  : handle.prefix;
              return (
                <button
                  type="button"
                  key={handle.id}
                  className="slider-handle"
                  style={{ left: `${activePercent}%` }}
                  onPointerDown={(event) => beginDrag(event, handle)}
                  disabled={disabled}
                  aria-label={`${handleLabel} boundary set to /${activeLabel}`}
                >
                  <span className="slider-handle-label">/{activeLabel}</span>
                </button>
              );
            })}
            {hoverState.isVisible && (
              <div
                className="slider-hover-tooltip"
                style={{
                  left: `${hoverState.x}px`,
                  top: `${hoverState.y}px`,
                }}
              >
                {hoverState.label}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="slider-scale">
        {scaleMarks.map((mark) => (
          <span key={`mark-${mark}`} className="slider-scale-mark">
            /{mark}
          </span>
        ))}
      </div>
    </div>
  );
}

export default HierarchicalSlider;
// Design agent: Also export named for import flexibility and IDE refactors.
export { HierarchicalSlider };
