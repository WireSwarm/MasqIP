[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Amélioration des sections
## Section 1 - Hierarchical IPv4 Plan
### Méthode 1 - host sizing
- Avant de procéder au calcul, il faut faire un tri décroissant des nombres d'hôtes demandés et calculer à partir de cet ordre.
- Les subnets groupes doivent être dépliables si en tout il y a trop d'adersses.
### Méthode 2 - Path plan
Le champ "Count" De la dimmention est trop grand et dépasse la section. Assure toi de corriger ce problème.

## Section 3 - IPv4 Insight Panel
Tu devras choisir 2 couleurs pour le textes : color1 et color2.
color1 devras correspondre à la partie réseau. Color 2 la partie hôte.
Tu devras prendre ip/cidr qu'à entré l'utilisateur et l'afficher dans "resultcard" avec les propriétés suivantes
color1 et color2 en fonction de son masque.
Si le masque coupe en plein milieu de l'octet. Tu devras faire un décradé couleur1 vers couleur2 sur l'octet corresponant.
Ajoute un champ dans la élément dans la result-card uniquement si le masque arrive en plein milieu d'un octet.
Ce champ sera l'octet en binaire, avec color1 et color2.

- à gauche du progress-indicator dans la progress bar, il doit y avoir l'adersse du réseau (uniquement la partie hôte, avec la color2)
- à droite du progress-indicator dans la progress bar, il doit y avoir l'adresse de broadcast (uniquement la partie hôte avec la color2)

Dans la progresse bar, le la bulle blanche du progress-indicator doit pouvoir dépasser le cadre imposé par la progress bar. Elle ne doit pas donner l'impression d'être coupée en haut et en bas.

- insight-grid tu peux mettre 2 colonnes

# Amélioration des champs IP
Le seul cas où il peut avoir un champ vide, est quand celui du dessus est rempli.
La touche entrée ajoute et passe au champ suivant (dessous).
Quand l'utilisateur est dans le champ vide et qu'il fait la touche "backspace" effet :
- revient sur le champ d'avant (du dessus)
- met le curseur à la fin
- supprime le dernier caractère 
# Design
Aucune modification du style actuel n'est demandé.