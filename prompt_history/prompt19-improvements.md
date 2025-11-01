[IMPORTANT] Make sure to read the file "AGENTS.md"
# Section : IPv4 Insight Panel 
## Gesion des couleurs
* ipv4-endpoint-network doit avoir la couleur b
* ipv4-endpoint-broadcast doit avoir la couleur c
* le span dans ipv4-progress-indicator doit
 - si l'utilisateur entre l'adresse de réseau, la couleur b.
 - Si l'utlisateur entre l'adresse de broadcast, la coueurc.

###  ipv4-insight-progress-track
* Sur l'extrème gauche et l'extrème droite, la couleur du dessous est un peu visible, or elle doit être totalement recouverte.
* La bare de progression doit donner l'impression que : à droite du ipv4-progress-indicator, il n'y ait que du violet, et que à gauche il n'y ait que du orange.
## Ajout d'informations
Rajoute un élément dans ipv4-insight-columns qui s'appelle "Next Networks"
il devra contenir les 3 prochains réseaux suivant le réseau qu'a entré l'utilisateur.

## Ajustement du style 
* ipv4-progress-indicator ne doit pas avoir de ::after.
## Comportement global
* Une fois que l'utilisateur entre une adresse IP, un nouveau ipv4-cidr-input apparaît sous ipv4-insight-card
*quand le nouveau ipv4-cidr-input est valide (bon format) ipv4-insight-card devient collapsable (obtient la capacité de se collaps au clic) et se collapse automatiquement.

# Hierarchical IPv4 Plan
* Fait en sorte que dans l'address explorer de la méthode 2: Path plan, l'host index commence à 1 au lieu de 0
* Fait en sorte qu'il y ait une case cochable dans l'adress explorer qui permette de faire en sorte que la première addresse d'un réseau soit 1 au lieu de 0, cela est différent de la requette du dessus car pour les hosts, il n'y aura pas de case cochable, la première host sera toujours 1.
* Fait en sorte que dans le path plan, on puisse séléctionner un masque au dessous de /8, par exemple un sous réseau en /3. Il faut que ce soit possible d'y accéder depuis la slidebar.