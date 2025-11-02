// Design agent: Centralises dynamic list normalisation so multi-field forms stay consistent.
// Developer agent: Provides a configurable helper that enforces a single trailing empty item.
export const normaliseWithTail = (values, options = {}) => {
  const {
    maxItems = 0,
    createEmpty = () => '',
    cleanValue = (value) => value,
    isEmpty = (value) => value == null || value === '',
  } = options;

  const safeValues = Array.isArray(values) ? values : [];
  const normalised = [];
  let hasTrailingEmpty = false;

  for (const candidate of safeValues) {
    const cleaned = cleanValue(candidate);
    if (isEmpty(cleaned)) {
      if (!hasTrailingEmpty) {
        normalised.push(createEmpty());
        hasTrailingEmpty = true;
      }
    } else {
      normalised.push(cleaned);
      hasTrailingEmpty = false;
    }
    if (maxItems > 0 && normalised.length === maxItems) {
      break;
    }
  }

  const belowLimit = maxItems === 0 || normalised.length < maxItems;
  if (!hasTrailingEmpty && belowLimit) {
    normalised.push(createEmpty());
  }

  return normalised;
};
