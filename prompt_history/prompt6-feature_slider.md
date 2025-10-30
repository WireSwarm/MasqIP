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
🎯 Objectif

Changer la manière de définir les sous-réseaux : remplacer le choix manuel du nombre par un slider interactif permettant de visualiser la répartition des adresses selon les couches (layers) du plan d’adressage.

🧩 Fonctionnalités à implémenter
1. Slider principal (Layer 1)

Le supernet est défini (exemple : 10.0.0.0/8).

Le slider s’affiche, gradué de /8 à /32.

Position initiale : /24 (si possible, sinon /32).

Le slider est divisé en deux parties :

Gauche → Couleur A (représente le layer 1, par exemple un bâtiment).

Droite → Couleur Hôte.

2. Fonction "aimant" (magnet)

Quand l’utilisateur déplace le curseur, celui-ci est attiré automatiquement vers les valeurs /16, /24, /32.

Plus la vitesse de glissement est grande, plus l’effet d’aimantation est fort.

L’utilisateur doit tout de même pouvoir se positionner facilement sur une valeur intermédiaire.

3. Gestion des layers supplémentaires

Un bouton "+" permet d’ajouter un layer supplémentaire.

Lorsqu’un nouveau layer est ajouté, une nouvelle section colorée (Couleur B, C, D, etc.) apparaît entre la couche précédente et la zone hôte.

Chaque séparation est marquée par un indicateur draggable (comme celui du premier slider).

Un bouton "–" permet de supprimer le dernier layer ajouté.

Le bouton "–" est masqué si la suppression n’est pas possible.

4. Couleurs

Quatre couleurs principales : A, B, C, D.

Elles doivent être compatibles avec la palette existante.

Ces couleurs s’affichent sur le slider selon le nombre de layers actifs.

🧮 Contraintes techniques

Le slider ne doit jamais aller en deçà du supernet (exemple : pas moins que /8 dans 10.0.0.0/8).

Les valeurs disponibles vont de /8 à /32.

Les anciens éléments :

path dimensions

networksize
→ doivent être supprimés, car leurs fonctions sont remplacées par le slider.

✅ Résumé des impacts

UI : refonte du contrôle de sous-réseaux.

UX : ajout de feedback visuel (couleurs + aimantation).

Code : suppression des anciens composants (path dimensions, networksize).

## Section 2 - Route Summarizer

## Section 3 - IPv4 Insight Panel
