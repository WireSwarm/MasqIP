[IMPORTANT] Make sure to read the file "AGENTS.md"
# Section: IPv4 Insight Panel
## Color Management
* ipv4-endpoint-network must have color b
* ipv4-endpoint-broadcast must have color c
* the span in ipv4-progress-indicator must
- if the user enters the network address, use color b.
- If the user enters the broadcast address, use color c.
### ipv4-insight-progress-track
* On the far left and far right, the underlying color is somewhat visible, but it should be completely covered.
* The progress bar should give the impression that: to the right of the ipv4-progress-indicator, there is only purple, and to the left, there is only orange.
## Adding Information
Add an element in ipv4-insight-columns called "Next Networks"
It should contain the next 3 networks following the network entered by the user.
## Style Adjustment
* ipv4-progress-indicator should not have ::after.
## Global Behavior
* Once the user enters an IP address, a new ipv4-cidr-input appears below ipv4-insight-card
*When the new ipv4-cidr-input is valid (correct format) ipv4-insight-card becomes collapsible (gains the ability to collapse on click) and collapses automatically.
# Hierarchical IPv4 Plan
* Ensure that in the address explorer of method 2: Path plan, the host index starts at 1 instead of 0
* Ensure there is a checkbox in the address explorer to make the first address of a network 1 instead of 0; this is different from the previous request because for hosts, there will be no checkbox—the first host will always be 1.
* Ensure that in the path plan, a mask below /8 can be selected, for example, a subnet of /3. It must be possible to access this from the slidebar.
Request changes (optional)
