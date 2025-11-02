[IMPORTANT] Make sure to read the file "AGENTS.md"
Change l'icone de l'onglet pour brand-logo
Change le titre de l'ongle pour "MasqIP"

# Correction de des input
- il ne doit pas avoir d'input secondaire
- l'animation de la bordure ne fonctionne pas comme souhaité, en effet pas uniquement la bordure est affecté, il y a un gros rectangle qui tourne qui apparaît. Assure toi de copier et d'utiliser toutes les lignes de code présentes dans le fichier css_stuff/style.css (ce sont tous les éléménts nécessaire pour pouvoir faire l'animation)

- à droite de l'ipv4-progress-indicator dans ipv4-insight-progress-track ça doit être et rester violet (partie réseau.)

# Section 1
Dans method-two-address-explorer-summary le style n'utilise pas de bouton et utilise une case à cochée.
L'effet de cette case à coché doit être exactement le suivant :
- Offset +1 pour chaque layer redable 
Dans tous les cas, ajoute un offset +1 à la partie réseau (car l'host 3)
Exemple 
Super : 10.0.0.0/8
Layer 1 : /8 -> /16 (redable)
Layer 1 : /16 -> /24 (redable)
Case non cochée :
Adresse explorer layer 1 : 62, layer2 : 51, host :3
résultat : 10.61.50.3
avec case cochée :
résultat : 10.62.51.3