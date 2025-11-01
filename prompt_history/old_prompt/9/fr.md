[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Section 1 - Hierarchical IPv4 Plan - Méthode 2 - Path plan
- Le bouton pour supprimer un layer doit apparaître à gauche du bouton pour ajouter un layer. 
Effet voulu : le bouton d'ajout ne change jamais de place.

- Position du slider-handle à corriger, il n'est pas centré sur la séparation de couleur. Assure toi que ce soit le cas. 
Et la sémaration de couleur n'est pas toujours au bon endroit.
Trouve et corrige le problème.

- Replace the section name "IP Example" by a more relevant name.

- Un masque inférieur à /8 est possible.

- Le nom des layers (le span result-title) doit être directement modifiable.

- Le titre "Adress format" doit faire plus l'effet d'un petit titre. 
- Il faudrait rajouter des noms de titers aux élements dessus le "address format"
- Pour chaque layer, change "Network base" par "CIDR" et le résultat devras être le CIDR (e.g. /24)
- Pour chaque layer, change l' "Example" en quelque chose de plus pertinent, ou un exemple de plus pertinent.


## Amélioration de la prise en charge de la taille pour la formule
Je parle de l'élément cidr-octets présent à droite de la formule.
- il doit commencer à la ligne en dessous de l'élément formula 
- enlève "_index"
- enlève "/<CIDR>"
- Quand le cidr-segment dépasse 15 caractère remplace le reste par "..."
Retour à la ligne en cas de formule trop longue ( dépassement de la taille interne de la result-card ) :
- Séparation en deux au milieu. Si toujours pas suffisant comme suivant 
10.batiment.
etage.0
cet exemple montre juste comment faire la séparation.

- La formule n'affiche que la couleur du premier layer et pas des autres layeurs. Assure toi de l'affichage de toutes les couleurs, en gardant la même méthode de coupage qu'il existe déjà sur ce champ entre color1 et color2 (le violet et le orange).
