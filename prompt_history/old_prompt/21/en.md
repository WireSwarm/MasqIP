[IMPORTANT] Make sure to read the file "AGENTS.md"
Tab icon: Use brand-logo.
Tab title: Set to "MasqIP".
# Input Fixes
- There should not be a secondary input.
- The border animation is not working as intended; instead of only affecting the border, a large rotating rectangle appears. Make sure to copy and use all lines of code from css_stuff/style.css (these are all required elements for the animation to work).
- To the right of the ipv4-progress-indicator in ipv4-insight-progress-track, it must be and remain purple (network section).
# Section 1
In method-two-address-explorer-summary, do not use a button; use a checkbox instead.
The checkbox effect should be exactly as follows:
- Add an offset of +1 for each readable layer.
In any case, always add an offset of +1 to the network part (because host 3).
Example:
Super: 10.0.0.0/8
Layer 1: /8 -> /16 (readable)
Layer 1: /16 -> /24 (readable)
Checkbox unchecked:
Address explorer layer 1: 62, layer 2: 51, host: 3
Result: 10.61.50.3
With checkbox checked:
Result: 10.62.51.3
