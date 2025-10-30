[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Amélioration des sections
## Section 1 - Hierarchical IPv4 Plan
### Méthode 1 - host sizing
### Méthode 2 - Path plan
- Le style du bouton "Add dimention" doit être ajouter au projet en tant qu'élément réutisable. 
  Cet élément doit avoir un commentaire "Ne pas supprimer, besoin pour la suite du projet".
  Le bouton "Add dimention" doit être supprimer au détriment d'un nombre de dimmention dynamique

- Tu dois faire exactement la même chose avec le bouton reset. (Sauvagarde pour plus tard et suppression pour le moment.)

- Le champ "count" devra avoir comme valeur par défaut 1. Donc le calcul devrait quand même se faire si l'utilisateur n'entre rien.
- Le champ du label "Network size per leaf" devra avoir comme valeur par défaut 256. Donc le calcul devrait quand même se faire si l'utilisateur n'entre rien.
## Section 2 - Route Summarizer
- Le masque doit être facultatif
- Il faut cependant prévenir l'utilisateur que si ils précise pas le masque, ça admet que toutes les adresses IP qu'il entre, je te laisse choisir la méthode que tu veux pour l'avertir, la méthode que tu trouves la plus pertinante
  ont le même masque de sous réseau.

## Section 3 - IPv4 Insight Panel

Dans la zone "insight-grid"
- Le nombre total d'hotes doit apparaître
- Network doit disparaître
- Broadcast doit disparaître
- Boundary octet doit apparaître en haut de la zone. Dans le titre il doit y avoir le numéro de l'octet.
- Pour boundry octet, il doit y avoir une petite flèche en dessous de la séparation hosts qui compte le nombre de bits bleu. La petite flèche part de ce nombre et pointe la séparation.

Modification sur le mouse hover de la progress bar :
- ça doit être une vraie infobulle qui est à l'exact position de la souris
  Si la souris de situe sur la barre de progression, à gauche du progression idcator, ça doit afficher uniquement 
  le nombre d'adresses hôtes entre l'adresse du réseau et l'adresse actuelle.
  Avec le format suivant : "Number of hosts before : <value>"

  Même chose pour la partie de droite avec le format suivant "Number of hosts after : <value>".
  Value étant le nombre d'adresses hôtes entre l'adresse actuelle et l'adresse de broadcast.

- progress-host-label progress-host-label--left doit disparaitre (les octets couleur orange flotant au dessus de la progress indicator)

Change la méthode pour calculer la position de l'indicateur de progression sur la barre de progression :
- la position doit être définit par la position de l'hôte actuel (que l'utilisateur a entré) sur total d'hotes (déjà calculé à un autre enroit)

Du côté de la barre de progression, les endpoints doivents :
- N'afficher que les octets (décimal) comportant de la partie hôte
- Ne pas contenir le CIDR
- Contenir les préfixs "Net : <value>" pour l'endpoint de gauche (Partie hôte de l'adresse du réseau)
- Contenir les préfixs "Brd : <value>" pour l'endpoint de droite (Partie hôte de l'adresse de broadcast)


# Design
Aucune modification du style actuel n'est demandé.