[IMPORTANT] Make sure to read the "AGENTS.md" file before making any changes.
Before making changes, start with a concise checklist (3-7 points) detailing the main steps to follow for each requested correction or improvement.
After each code modification or component action, validate the correction in one to two lines and continue or rectify if necessary.
# Bug fixes and minor improvements
## IPv4 Insight Panel — cidr-display
- The IP address must be displayed on a single line.
- Color separation should no longer occur in the middle of an octet.
- The same problem is present in the cidr-display component of the Address explorer subsection, within the Hierarchical IPv4 Plan section, Method 2 Path plan.
## Section: Hierarchical IPv4 Plan, Method 2 Path plan
- Implement smart resizing of the field according to the formula length. The goal is to ensure optimal readability without the field overflowing.
- Fix the position of the progress bar slide handler. Currently, for /24, the vertical alignment is correct but for /16, the slide handler is positioned to the left of the Y-axis (vertically). Identify and resolve the mathematical alignment issue.
## General
- When a field is empty and backspace is pressed, return only to the previous field without deleting the last character.
- When a field is full (/<2char>), automatically move to the next field, as if the Enter key had been pressed.
