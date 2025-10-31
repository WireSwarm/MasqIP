[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Correction de bug et petite améliorations
Corrige le cidr-display de la section "IPv4 Insight Panel" 
- l'adresse ip doit tenir sur une seule ligne 
- La séparation de couleur en plein milieu d'un octet ne se fait plus
Le même problème est survenu sur le cidr-display de la sous section Address explorer de la section Hierarchical IPv4 Plan Méthode 2 Path plan.


# Section : Hierarchical IPv4 Plan Méthode 2 Path plan
- Fais un  redimmentionnement intelligent en fonction de la longueur sur la formule : . Le résultat doit être le plus lisible possible. Le champ ne doit pas dépasser.
- Corrige la position du slide handler de la progress bar. En effet pour /24 c'est aligné verticalement mais pour /16, le slite-handler se trouve sur la gauche de l'axe y (verticalement) trouve le problème mathématique et corrige le.
# Général
 -Quand un champ est vide, et qu'on appuye sur backspace, ça doit uniquement revenir au champ précédent, ça ne doit pas supprimer le dernier caractère.
- Quand un champ est plein(/<2char>) ça passe au champ dessous automatiquement (comme si entré à été appuyé.)
