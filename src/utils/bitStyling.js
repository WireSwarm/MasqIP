// Design agent: Aggregates the gradient logic that paints IPv4 bit slices across the UI.
// Developer agent: Exposes helpers so address visualisations reuse identical styling rules.
export const createBitGradientStyle = (bitSlice = [], fallbackColor = 'inherit') => {
  if (!bitSlice || bitSlice.length === 0) {
    return { color: fallbackColor };
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
