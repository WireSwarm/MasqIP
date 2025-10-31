[IMPORTANT] Be sure to read the file "AGENTS.md"
# Section Improvements
## Section 1 - Hierarchical IPv4 Plan
### Method 1 - Host sizing
- Before proceeding with the calculation, it is necessary to sort the requested host numbers in descending order and start the calculation from this order.
- The subnet groups must be expandable in case there are too many addresses in total.
### Method 2 - Path plan
The "Count" field of the dimension is too large and exceeds the section. Make sure to correct this issue.
## Section 3 - IPv4 Insight Panel
You will need to choose 2 colors for the text: color1 and color2.
color1 should correspond to the network part. color2 to the host part.
You must take the ip/cidr entered by the user and display it in the "resultcard" with the following properties: color1 and color2 based on its mask.
If the mask cuts in the middle of an octet, you must create a gradient from color1 to color2 on the corresponding octet.
Add a field in the element in the result-card only if the mask lands in the middle of an octet.
This field will be the octet in binary, with color1 and color2.
- To the left of the progress-indicator in the progress bar, there must be the network address (host portion only, with color2)
- To the right of the progress-indicator in the progress bar, there must be the broadcast address (host portion only, with color2)
In the progress bar, the white bubble of the progress-indicator must be able to exceed the frame imposed by the progress bar. It should not give the impression of being cut off at the top and bottom.
- In the insight-grid you can have 2 columns.
# IP Fields Improvement
The only case where there may be an empty field is when the field above is filled.
The enter key adds and switches to the next field (below).
When the user is in the empty field and presses the "backspace" key:
- returns to the previous field (above)
- puts the cursor at the end
- deletes the last character
# Design
No modification to the current style is required.