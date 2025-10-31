[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Amélioration des sections
## Section 1 - Hierarchical IPv4 Plan
### Méthode 1 - host sizing
### Méthode 2 - Path plan
Supprime l'implémentation du bouton reset dans (il a la classe ghost-button)
Change la default value pour le count en : 256. Cette valeur par défaut c'est une valeur par défaut dite "implicite" le champ doit rester vide et le placeholder doit rester visible
## Section 2 - Route Summarizer

## Section 3 - IPv4 Insight Panel
Pour le élément Boundary octet :
- Tu dois enlever la flèche
- que le élément situé au même endoit que "boundary-count" soit sous le format suivant :
<CIDR division euclidienne par 8> + <Reste>
Par exemple le CIDR est 18, alors il y aura "16+2" d'affiché.

Il fait que tu corriges les éléments Net et BRD en dessous de la progress bar.
Net doit être la fin pertinente de l'adresse du réseau
BRD goit être la fin pertinante de l'adresse de broadcast
Exemple :
le réseau 10.0.0.129/26
doit afficher NET: .128      BRD: .191
Autre exemple
le réseau 10.0.129.0/18
doit affichier NET: .128.0      BRD: .191.255

Méthode pour arriver à ce résultat : déduire le bout pertinet de l'adresse de réseau et l'adersse de broadcast. Choisir la méthode officielle pour calculer ces deux adresses.
NET : est le partie de droite de l'adresse de réseau
BRD : est la partie de droite de l'adresse de broadcast

Rappel : la longueur de la partie de droite dépend du nombre d'octet comportant de la partie hote dans le masque de sous-réseau. 
# Design
Aucune modification du style actuel n'est demandé.