[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Design
Les couleurs qui sont utilisés pusieurs fois doivent être dans des variables.
Exemple la couleur
hote : rgb(249, 115, 22)
et la couleur reseau : rgb(79, 70, 229)
# Amélioration des sections
## Section 1 - Hierarchical IPv4 Plan
### Méthode 1 - host sizing
### Méthode 2 - Path plan
🎯 Objective
Change the way subnets are defined: replace the manual selection of the number by an interactive slider that allows visualization of address allocation according to the layers of the addressing plan.
🧩 Features to implement
1. Main slider (Layer 1)
The supernet is defined (example: 10.0.0.0/8).
The slider is displayed, graduated from /8 to /32.
Initial position: /24 (if possible, otherwise /32).
The slider is divided into two sections:
Left → Color A (represents layer 1, for example a building).
Right → Host Color.
2. "Magnet" feature
When the user moves the cursor, it is automatically attracted to /16, /24, /32 values.
The faster the sliding speed, the stronger the magnetization effect.
The user must still be able to easily select an intermediate value.
3. Management of additional layers
A "+" button allows adding an extra layer.
When a new layer is added, a new colored section (Color B, C, D, etc.) appears between the previous layer and the host area.
Each separation is marked by a draggable indicator (like the main slider).
A "–" button removes the last added layer.
The "–" button is hidden if removal is not possible.
4. Colors
Four main colors: A, B, C, D.
They must be compatible with the existing palette.
These colors are displayed on the slider according to the number of active layers.
🧑‍💻 Technical constraints
The slider must never go below the supernet (for example: no less than /8 in 10.0.0.0/8).
Available values go from /8 to /32.
Old elements:
path dimensions
networksize
→ must be removed, as their functions are replaced by the slider.
✅ Impact summary
UI: redesign of the subnet control.
UX: addition of visual feedback (colors + magnetization).
Code: removal of old components (path dimensions, networksize).
removal of the reset button
