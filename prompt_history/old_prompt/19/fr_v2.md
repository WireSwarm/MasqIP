[IMPORTANT] Make sure to read the file "AGENTS.md"
# Section : IPv4 Insight Panel 
## Gesion des couleurs
* ipv4-endpoint-network doit avoir la couleur b
* ipv4-endpoint-broadcast doit avoir la couleur c
* le span dans ipv4-progress-indicator doit
 - si l'utilisateur entre l'adresse de réseau, la couleur b.
 - Si l'utlisateur entre l'adresse de broadcast, la coueurc.

## Ajout d'informations
Ajoute un élément dans ipv4-insight-columns qui s'appelle "Next Networks"
il devra contenir les 3 prochains réseaux suivant le réseau qu'a entré l'utilisateur.

## Ajustement du style 
* ipv4-progress-indicator ne doit pas avoir de ::after.
## Comportement global
* Une fois que l'utilisateur entre une adresse IP, un nouveau ipv4-cidr-input apparaît sous ipv4-insight-card
*quand le nouveau ipv4-cidr-input est valide (bon format) ipv4-insight-card devient collapsable (obtient la capacité de se collaps au clic) et se collapse automatiquement.
Le but ici est que l'utilisateur peut inspecter autant de réseaux qu'il veut.
Le comportement des champs input doit être similaire à celui de la section Route Summarizer

# Hierarchical IPv4 Plan
* Fait en sorte que dans l'addresse explorer de la méthode 2: Path plan, ajoute systématiquement +1 à la partie hôte (l'hôte ne doit pas être l'adresse du réseau.)
* Fait en sorte qu'il y ait une case cochable dans l'adress explorer qui permette
* 
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

Assure toi en faisant des tests que l'exemple est bien respecté.