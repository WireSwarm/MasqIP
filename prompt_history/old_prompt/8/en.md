[IMPORTANT] Make sure to read the "AGENTS.md" file
# Section 1 - Hierarchical IPv4 Plan - Method 2 - Path plan
## Drag UX/UI
- You need to improve the style (slide handler), especially the color (preferably neutral and light), and its shape (I would opt for something vertical and thin)
- The percentage of the magnet's attraction distance should be lower
- The magnet should be much more sensitive to the cursor’s slowness.
## Information Dispatching
- The color of the layer should be displayed for each corresponding layer in the result card
- Under each layer, the network address of the layer should appear.
- Display a boolean "Readable"
Yes will lean towards a green color
No will lean towards a red color.
The condition for readability is: the layer must be on a full octet.
Add a note for IPv6 warning that it is readable if the mask does not cover a decisive half-octet necessary to display the hexadecimal character and that it is readable.
New expandable section (like in markdown with >) called "IP examples"
The user will be able to request, for example, the 5th network of layer 1, the 12th network of layer 2, and the 23rd address. You will need to display the result accordingly. Use the color method like cidr-display in the "IPv4 Insight Panel"
The last "Host allocation" should be replaced by "address format"
Use the color method as in cidr-display in the "IPv4 Insight Panel" as well.
The format should display the calculation method to obtain the IP given in the example in the section above.
For example:
supernet: 10.0.0.0/8
Result: "10.building_number.floor_number.0/24" with the colors
assuming that layer 1 is called building_number and floor_number is layer 2.
here the address is readable.
Here is another example where it is not readable.
possible format example
10.128+building_number.4×floor_number.0/24
this means that to find the network with a particular building and floor number, you must apply the formula above.
multiplication should be represented by "U+00D7"
## Slider Hover:
As for the tooltip present on the progress bar in the IPv4 Insight Pane section.
I want it to display the number of networks available for the corresponding layer.
For the host allocation part it will display the total number of available hosts.