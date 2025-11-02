[IMPORTANT] Make sure to read the file "AGENTS.md"
# Global
- Add an id to almost every HTML element; the id should correspond to the function of the element.
## IPv4 Insight Panel
- In the cidr-display section of the IPv4 Insight Panel, when the mask is not divisible by eight, the host part is underlined. Remove only this underline. The same issue exists in method 2 of the Address Explorer.
- The progress-indicator is buggy: it does not move, and the style is broken. The style should match the white bubble present in git version 21da971. Fix this as part of the required bug fixes.
- In the boundary-count section, only the digit after the '+' should be colored.
## Hierarchical IPv4 Plan - Method 2
- Completely remove the Key Metrics section.
- In the layer breakdown section, remove all information from the "result-meta" elements.
- The Address Explorer should be clickable across its entire width, not just the text. This should apply to all future expandable sections.
## Hierarchical IPv4 Plan - Method 1
- In method 1 - Host sizing, the count element overflows at certain screen widths. Fix this display intelligently.
- This element should not have a default value.
# Design
Arrange the layout and proportions of the logo, title, and its description.
optimise et traduis en anglais stp
