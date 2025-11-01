[IMPORTANT] Make sure to read the file "AGENTS.md"
# Section Improvements
## Section 1 - Hierarchical IPv4 Plan
### Method 1 - host sizing
### Method 2 - Path plan
- The style for the "Add dimension" button must be added to the project as a reusable component.
This component must have a comment: "Do not remove, needed for the continuation of the project."
The "Add dimension" button itself must be removed in favor of a dynamic number of dimensions.
- You must do exactly the same thing for the reset button (save it for later use, but remove it for now).
- The "count" field should have a default value of 1. Calculations should still be performed if the user leaves it empty.
- The label field "Network size per leaf" should have a default value of 256. Calculations should still be performed if the user leaves it empty.
## Section 2 - Route Summarizer
- The mask must be optional.
- However, you must inform the user that if they do not specify the mask, it is assumed that all IP addresses entered share the same subnet mask. You can choose the method you find most relevant to notify them.
## Section 3 - IPv4 Insight Panel
In the "insight-grid" area:
- The total number of hosts must be displayed
- "Network" must be removed
- "Broadcast" must be removed
- Boundary octet must appear at the top of the zone. The title must include the number of the octet.
- For the boundary octet, there must be a small arrow below the hosts separation that counts the number of blue bits. The small arrow should start from this number and point to the separation.
Modification on mouse hover of the progress bar:
- It must be a real tooltip located at the exact position of the mouse.
If the mouse is over the progress bar, to the left of the progress indicator, display only
the number of host addresses between the network address and the current address.
Use the following format: "Number of hosts before: <value>"
Do the same thing for the right side with the format: "Number of hosts after: <value>".
Value is the number of host addresses between the current address and the broadcast address.
- The element 'progress-host-label progress-host-label--left' must be removed (the floating orange octets above the progress indicator).
Change the method for calculating the position of the progress indicator on the progress bar:
- The position should be defined by the current host's position (entered by the user) over the total hosts (already calculated elsewhere).
On the progress bar endpoints:
- Display only the octets (decimal) pertaining to the host part
- Do not show the CIDR
- Prefix with "Net: <value>" for the left endpoint (host part of the network address)
- Prefix with "Brd: <value>" for the right endpoint (host part of the broadcast address)
# Design
No changes to the current style are required.
Request changes (optional)
