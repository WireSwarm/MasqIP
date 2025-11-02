[IMPORTANT] Make sure to read the file "AGENTS.md"
# Comportement des inputs & résultats
Le but ici est d'améliorer l'ux.
quand l'utilisateur a entré une adresse ip valide ex: 192.179.1.120/24 il y a des résultats qui apparaissent. Par la suite quand l'utilisateur change l'entrée, ça passe de l'état valide -> invalide -> valide
* Crée une variable/des varaibles contenant le last-valid-state, le but ici est d'afficher le dernier résultat résultat valide, tant que le champ n'est pas de nouveau valide.

Nouveau comportement quand le champ est invalide:
* cas 1 : invalid mais avec focus, une border rouge qui tourne autour de l'élément, utilise même css que tu peux trouver dans le fichier css_stuff>style.css (tu as le drois de lecture sur ce fichier)
* cas 2 : invalid sans le focus : une border rouge statique.

# Section IPv4 Insight Panel
* les inputs doivent se comporter exactement comme sur la section 2 Route Summarizer.
Rappel des propriétés 
- entré passe au suivant
- backspace si vide passe au précédent
- l'input du dessous apparaît uniquement si l'input du dessus est valide.
Utilise un composant commun pour le comportement des inputs et réutilise ce composant dans la section Section IPv4 Insight Panel
## Couleurs
Les couleurs sur ipv4-insight-progress-track laisses au extrémités apparaître l'autre couleurs. Assure toi que la couleur couve totalement l'autre couleur . (violet - progress indictor - orange)
le violet représente la partie réseau et le orange représente la partie hote.  (écris le en commentaire dans le code)
Attention les couleurs ipv4-boundary-network-bits doivent être permutés en conséquence. 
* les endpoints ont des couleurs indépendantes et ne doivent pas être modifiés (écris le en commentaire dans le code)



## Modification de path plan
* Modifie le bouton Treat first network address as 1, retire toutes ses fonctionalitées et fait juste en sorte que si les NETWORKS sont readables, tu ajoute simplement +1 au sous réseau en question.
* Retire les indicateurs suivants de la slidebar: /2, /3, /4, /5, /6, /7 et fait juste e, sorte q'uil y ait tout le temps 5 indicateurs: /0, /8, /16, /24 et /32, le f