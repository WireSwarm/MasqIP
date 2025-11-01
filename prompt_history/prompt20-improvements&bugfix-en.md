[IMPORTANT] Make sure to read the file "AGENTS.md"
# Behavior of Inputs & Results
The goal here is to improve UX.
When the user enters a valid IP address, e.g., 192.179.1.120/24, results should appear. If the user subsequently changes the input, transitioning from valid -> invalid -> valid,
* Create a variable/variables to store the last-valid-state. The aim is to display the last valid result as long as the field is not valid again.
New behavior when the field is invalid:
* Case 1: invalid but with focus, a pulsating red border should appear around the element. Use the same CSS as found in the file css_stuff>style.css (you have read access to this file)
* Case 2: invalid without focus: a static red border.
# IPv4 Insight Panel Section
* The inputs must behave exactly like in Section 2 Route Summarizer.
Reminder properties:
- Enter moves to the next field
- Backspace when empty moves to the previous field
- The input below only appears if the input above is valid.
Use a shared component for input behavior and reuse this component in the IPv4 Insight Panel Section.
## Colors
On ipv4-insight-progress-track, ensure the color at the ends does not let the other color bleed through. Make certain that each color completely covers the other (violet = progress indicator, orange = host section).
Violet represents the network part and orange the host part. (Write this in code comments)
Note that ipv4-boundary-network-bits colors must be switched accordingly.
* The endpoints have independent colors and must not be changed. (Write this in code comments)
## Path Plan Modification
* Edit the button 'Treat first network address as 1'. Remove all its functionalities and make it so that if NETWORKS are readable, you simply add +1 to the relevant subnet.
* Remove the following indicators from the slider: /2, /3, /4, /5, /6, /7. Ensure there are always exactly 5 indicators: /0, /8, /16, /24, and /32.
Request changes (optional)
