[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Section 1 - Hierarchical IPv4 Plan - Méthode 2 - Path plan
## UX/UI du drag
- Tu dois améliorer le style (slide handler) notemment la couleur (plutot neutre et light), et sa forme (j'opterais pour quelque chose de vertical et fin)
- Le pourcentage de distance de l'attration de l'aimant doit être plus faible
- L'aimant doit être beaucoup plus sensible à la lenteur du curseur.

## Dispatching des informations
- La couleur du layer doit s'afficher pour chaque layer correspondant dans la result-card
- Sous chaque layer, l'adresse du réseau du layer doit apparaître.
- Afficher un booléen "Redable"
Oui s'orientera vers une couleur plutot verte
Non s'orientera vers une couleur plutot rouge.
La condition pour savoir si c'est redable est : il faut que le layer soit sur un octet complet.
Mettre une note pour ipv6 en avertissant que c'est redable si le masque n'est pas en plein d'un demi octet déterminant pour afficher le caractère hexadécimal et qu'il soit redable.

Nouvelle section dépliable (comme en markdown avec le >) qui s'appelle "Examples d'ip"
L'utilisateur va pouvoir demander que tu lui affiches par exemple le 5ème réseau du layer 1, 12 ème réseau du layer2 et la 23 ème adresse. Tu devras lui afficher le résultat en conséquence. Utilise la méthode de couleurs comme cidr-display dans "IPv4 Insight Panel"

Le dernier "Host allocation" doit être remplacé par "adress format"
Utilise la méthode de couleurs comme cidr-display dans "IPv4 Insight Panel" aussi.
Le format doit afficher la méthode de calcul pour obtenir l'ip obtenu en exemple sur la section du dessus.
Par exemple.
supernet : 10.0.0.0/8
Résultat : "10.numéro_batiment.numéro_étage.0/24" avec les couleurs
en partant du principe que le layer 1 s'appelle numéro_batiment et que numéro_étage soit le layer 2.
ici l'adresse c'est redable.
Voici un autre exemple où ce n'est pas redable.
exemple de format possible
10.128+numéro_du_batiment.4*numéro de l'étage.0/24
cela veut dire que pour trouver le réseau avec un certain numéro du batiment et d'étage il faut appliquer la formule ci-dessus.
la multiplication doit être représenté par "U+00D7"


## Hover du slider:
Comme pour l'infobulle présent sur la progress bar de la section IPv4 Insight Pane.
Je veux que ça affiche le nombre de réseau disponible pour le layer correspondant.
Pour la partie host allocation ça affichera le nombre total d'hôte disponible.