[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Amélioration des sections
## Section 1 - Hierarchical IPv4 Plan
### Méthode 1
L'utilisateur doir pouvoir ajouter un multiplier ex :
Dans le champ, l'utilisateur dit qu'il veut un réseau de 500 hôtes. Cependant il veut 3 réseaux comme celui-celui
Au lieu qu'il entre 3 fois le nombre 500, il peut entrer une fois 500 et un 3.
### Méthode 2
Tu ajoueras une autre méthode sans la même section
Cette méthode sert à calculer un plan d'adressage. 
Voici un exemple.
L'utilisateur veut faire son plan d'adressage en fonction du batiment et de l'étage dans lequel il se situe.
on va appelé [batiment,etage] "le path".
Pour cela il entre premièrement 2 champs où il met :
- son supernet (10.0.0.0/8)
- le nombre d'adresses/de réseaux qu'il veut au pour chaque element du path, en l'occurence il entre 
- 255 (le nombre de bâtiment)
- 255 (le nombre d'étages)
- 255 (la taille du réseau pour chaque étage)

Le calculateur doit alors lui proposer un plan comme celui-ci:
10.num_batiment.num_etage.0/24

## Section 3 - IPv4 Insight Panel
### Arrangement des informations
Retire les champs :
- Next network
- Total IPs
- Usable IPs
- Used IPs
- Largest free range
- Smallest free range
#### barre de progression
à gauche de la barre de progression tu devras mettre la fin importante de l'adresse de réseau.
à gauche de la barre de progression tu devras mettre la fin importante de l'adresse de broadcast.
définition ip actuelle : la fin d'adresse ip qui se trouve sur la barre de progression.
Quand l'utilisateur met sa souris(hover) sur barre de progression, à droite de l'ip actuelle :
- ça affiche dans une infobulle le nombre d'adresse ip utilisable entre l'adresse ip actuelle et l'adresse de broadcast.

Quand l'utilisateur met sa souris(hover) sur barre de progression, à gauche de l'ip actuelle :
- ça affiche dans une infobulle le nombre d'adresse ip utilisable entre l'adresse ip actuelle et l'adresse du réseau.

exemple ascii
entrée : 172.16.124.125/16

.0.0 ---- .124.125 ---- .255.255

Disclamer : le nombre de tirets dans l'exemple n'est pas proportionnel au cas présenté.



exemple ascii :
l'utilisateur entre 

# Amélioration des champs IP



# Design
[IMPORTANT] Le style général doit être moderne, et un peu futuriste.
Tu devras modifier certaines couleurs de la palette de couleurs pour faire un mode sombre.
Tu ajouter du glassmorphism et/ou du Frosted glass effect.
En background sombre, ajoute des gros disque translucides, inspire toi de ce que tu peux trouver sur le web.