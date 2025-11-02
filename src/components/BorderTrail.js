// Design agent: Provides a reusable border trail animation adapted from the shared motion primitives module.
// Developer agent: Mirrors the original API so inputs can consume a declarative component without bespoke CSS hacks.
import { motion } from 'motion/react';

const combineClasses = (...tokens) => tokens.filter(Boolean).join(' ');

function BorderTrail({
  id,
  className,
  containerClassName,
  size = 60,
  transition,
  onAnimationComplete,
  style,
}) {
  // Design agent: Keeps the animation smooth with a linear loop unless consumers override it.
  const defaultTransition = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

  return (
    <div
      id={id}
      className={combineClasses('border-trail-container', containerClassName)}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1px solid transparent',
        pointerEvents: 'none',
        maskClip: 'padding-box, border-box',
        maskComposite: 'intersect',
        maskImage: 'linear-gradient(transparent, transparent), linear-gradient(#000, #000)',
        WebkitMaskClip: 'padding-box, border-box',
        WebkitMaskComposite: 'source-out',
        WebkitMaskImage:
          'linear-gradient(transparent, transparent), linear-gradient(#000, #000)',
      }}
    >
      <motion.div
        className={combineClasses('border-trail-cursor', className)}
        style={{
          position: 'absolute',
          aspectRatio: '1 / 1',
          width: `${size}px`,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}

export default BorderTrail;
export { BorderTrail };
