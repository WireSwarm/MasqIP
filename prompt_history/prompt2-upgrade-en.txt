[IMPORTANT] Make sure to read the file "AGENTS.md"
# Section Improvements
## Section 1 - Hierarchical IPv4 Plan
### Method 1
The user must be able to add a multiplier, for example:
In the field, the user specifies that they want a network of 500 hosts. However, they want 3 networks like this one.
Instead of entering the number 500 three times, they can enter 500 once and then a 3 as the multiplier.
### Method 2
Add another method in the same section.
This method is used for calculating an address planning scheme.
Example:
The user wants to create their address plan based on the building and the floor on which it is located.
We will call [building, floor] the "path".
For this, the user first enters two fields:
- Their supernet (e.g., 10.0.0.0/8)
- The number of addresses/networks they want for each element in the path (in this case, they enter:)
- 255 (number of buildings)
- 255 (number of floors)
- 255 (network size for each floor)
The calculator should then propose a plan like this:
10.[building_number].[floor_number].0/24
## Section 3 - IPv4 Insight Panel
### Information Arrangement
Remove the following fields:
- Next network
- Total IPs
- Usable IPs
- Used IPs
- Largest free range
- Smallest free range
#### Progress Bar
To the left of the progress bar, display the last significant part (octet) of the network address.
To the right of the progress bar, display the last significant part (octet) of the broadcast address.
Define 'current IP': the last octet of the IP address which is pointed at on the progress bar.
When the user hovers over the progress bar, to the right of the current IP:
- show in a tooltip the number of usable IP addresses between the current IP address and the broadcast address.
When the user hovers over the progress bar, to the left of the current IP:
- show in a tooltip the number of usable IP addresses between the current IP address and the network address.
ASCII example
Input: 172.16.124.125/16
.0.0 ---- .124.125 ---- .255.255
Disclaimer: The number of dashes in the example is not proportional to the case presented.
# IP Fields Improvements
# Design
[IMPORTANT] The general style must be modern and somewhat futuristic.
You must modify certain colors of the color palette to achieve a dark mode.
Add glassmorphism and/or frosted glass effect.
For the dark background, add large translucent disks, taking inspiration from web designs you can find.
Request changes (optional)
