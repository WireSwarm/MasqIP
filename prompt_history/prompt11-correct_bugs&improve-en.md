[IMPORTANT] Make sure to read the file "AGENTS.md"
# Global
- Add an id to all elements
Fix the color of the byte (when the mask cuts in the middle) of the "inspecting" element in the IPv4 Insight Panel section. There is the same problem on the "Result" element of the Address Explorer subsection of Method 2 in Hierarchical IPv4 Plan. To fix this issue, you can refer to the method used to display "formula" from method 2 of section 1.
# Section: IPv4 Insight Panel
- The progress-indicator should be proportional to the total number of hosts.
- The span in the progress-indicator should have the ending bytes of the entered address (bytes containing any part of the host portion). Pay attention to the style: the text must expand the bubble horizontally. The text color should match the color of the host part. You can set its id as "span-bubble".
- This same bubble should be draggable across the entire progress bar, just like the slider in method 2 of section 1.
- The left endpoint below the progress bar should be colored --layer-color-b.
- The right endpoint below the progress bar should be colored --layer-color-c.
- If the user enters the network address, span-bubble should be colored --layer-color-b.
- If the user enters the broadcast address, span-bubble should be colored --layer-color-c.
- boundary-count, below the binary-octet, should be in the format: "/<CIDR> = <actual_sum>"
- If it's a multicast address that is entered, display which service this address belongs to. To do this, add a file that serves as a database for all types of IP addresses. Optimize.
- Below the progress bar with inspecting and net brd, add a column to display all insight-titles in two columns.
# Section Hierarchical IPv4 Plan - Method 2
- slider-track should be a bit lower (so slider-handle-label does not overlap the buttons)
- The span with the classes "readable-tag is-readable" should be on a single line.
- The formula div, with the IPv6 tip, should be at the top of the result-card.
- The Address Explorer details should be just below.
- The plan overview can be replaced by something more relevant to display (avoid showing duplicates or things that can be easily guessed).