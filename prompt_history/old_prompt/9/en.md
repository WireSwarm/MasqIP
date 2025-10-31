[IMPORTANT] Be sure to read the file "AGENTS.md"
# Section 1 - Hierarchical IPv4 Plan - Method 2 - Path Plan
- The button to delete a layer must appear to the left of the button to add a layer.
Desired effect: the add button should never move.
- Fix the position of the slider handle, as it is not centered on the color separation right now. Ensure it is centered.
Also, the color separation is not always in the correct place. Find and fix the issue.
- Replace the section name "IP Example" with a more relevant name.
- Masks smaller than /8 are allowed.
- The names of the layers (the span result-title) must be directly editable.
- The title "Address format" should look more like a small heading.
- There should be additional section titles for the elements above "address format".
- For each layer, change "Network base" to "CIDR", and the result should be the CIDR (e.g., /24).
- For each layer, change the "Example" to something more relevant, or a more relevant example.
## Improved handling of the size for the formula
This refers to the element cidr-octets, located to the right of the formula.
- It must start on the line below the formula element.
- Remove "_index"
- Remove "/<CIDR>"
- When the cidr-segment exceeds 15 characters, replace the rest with "..."
Line break in case the formula is too long (exceeds the internal size of the result-card):
- Split in two at the middle. If still not enough, as in the following example:
10.building.
floor.0
This example just shows how to break the line.
- The formula currently shows only the color of the first layer, not the others. Ensure all layer colors are displayed, keeping the same color split method that already exists between color1 and color2 (purple and orange).
