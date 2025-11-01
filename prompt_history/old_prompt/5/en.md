# Section Improvements
## Section 1 - Hierarchical IPv4 Plan
### Method 1 - host sizing
### Method 2 - Path plan
Remove the implementation of the reset button (it has the ghost-button class)
Change the default value for the count to: 256. This default value should be considered an "implicit" default value: the field must remain empty and the placeholder must remain visible
## Section 2 - Route Summarizer
## Section 3 - IPv4 Insight Panel
For the Boundary octet element:
- Remove the arrow
- The element located in the same place as "boundary-count" must use the following format:
<CIDR integer division by 8> + <Remainder>
For example if the CIDR is 18, "16+2" should be displayed.
You must fix the Net and BRD elements below the progress bar.
Net must show the relevant ending for the network address
BRD must show the relevant ending for the broadcast address
Example:
For network 10.0.0.129/26
display: NET: .128 BRD: .191
Another example
For network 10.0.129.0/18
display: NET: .128.0 BRD: .191.255
Method to arrive at this result: determine the pertinent part of the network address and the broadcast address. Choose the official method to calculate these two addresses.
NET: is the rightmost part of the network address
BRD: is the rightmost part of the broadcast address
Reminder: the length of the right part depends on the number of octets in the host part in the subnet mask.
# Design
No modification to the current style is requested.
Request changes (optional)
