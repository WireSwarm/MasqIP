import { useEffect, useMemo, useRef, useState } from 'react';
import './HierarchicalSlider.css';

const TRACK_MAX_PREFIX = 32;
const LAYER_COLORS = [
  'var(--layer-color-a)',
  'var(--layer-color-b)',
  'var(--layer-color-c)',
  'var(--layer-color-d)',
];
const HOST_COLOR = 'var(--layer-host-color)';

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

  // Design agent: Ensures magnet anchors stay ordered for predictable snapping.
  const magnetPoints = useMemo(() => {
    if (!magnets || magnets.length === 0) {
      return [];
    }
    return [...magnets].sort((a, b) => a - b);
  }, [magnets]);

  // Design agent: Precomputes slider segments for painting the gradient track.
  const trackStyle = useMemo(() => {
    if (!handles || handles.length === 0) {
      return { background: HOST_COLOR };
    }

    const sortedHandles = [...handles].sort((a, b) => a.prefix - b.prefix);
    const range = Math.max(0.0001, TRACK_MAX_PREFIX - supernetPrefix);
    const stops = [];
    let cursor = 0;
    let previousPrefix = supernetPrefix;

    sortedHandles.forEach((handle, index) => {
      const paintPrefix = resolvePaintPrefix(handle, dragState, supernetPrefix);
      const boundedPrefix = Math.min(TRACK_MAX_PREFIX, Math.max(previousPrefix, paintPrefix));
      const span = Math.max(0, boundedPrefix - previousPrefix);
      const width = (span / range) * 100;
      const colour = LAYER_COLORS[index % LAYER_COLORS.length];
      const start = Math.min(100, cursor);
      const end = Math.min(100, cursor + width);
      stops.push(`${colour} ${start}%`, `${colour} ${end}%`);
      cursor = end;
      previousPrefix = boundedPrefix;
    });

    const remainderSpan = Math.max(0, TRACK_MAX_PREFIX - previousPrefix);
    const remainderWidth = (remainderSpan / range) * 100;
    const remainderStart = Math.min(100, cursor);
    const remainderEnd = Math.min(100, cursor + remainderWidth);
    stops.push(`${HOST_COLOR} ${remainderStart}%`, `${HOST_COLOR} ${remainderEnd}%`);

    return {
      background: `linear-gradient(90deg, ${stops.join(', ')})`,
    };
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
      const magnetThreshold = Math.min(2.5, Math.max(0.12, speed * 0.18));

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

  return (
    <div className={`hierarchical-slider${disabled ? ' is-disabled' : ''}`}>
      <div className="slider-toolbar">
        <span className="slider-title">Layer distribution</span>
        <div className="slider-actions">
          <button
            type="button"
            className="ghost-button slider-button"
            onClick={onAddLayer}
            disabled={!canAdd || disabled}
            aria-label="Add layer"
          >
            +
          </button>
          {canRemove && (
            <button
              type="button"
              className="ghost-button slider-button"
              onClick={onRemoveLayer}
              disabled={disabled}
              aria-label="Remove last layer"
            >
              –
            </button>
          )}
        </div>
      </div>
      <div className="slider-track">
        <div className="slider-rail" ref={railRef}>
          <div className="slider-track-fill" style={trackStyle} />
          {sortedHandles.map((handle) => {
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
            >
              <span className="slider-handle-label">/{activeLabel}</span>
            </button>
            );
          })}
          <div className="slider-track-overlay" />
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
