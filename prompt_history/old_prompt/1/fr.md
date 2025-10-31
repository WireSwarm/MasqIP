#Initialisation
## Minmum design
### Palette de couleurs
Conformément aux norme material design:
- Primary
- Primary Variant 
- Secondary 
- Secondary Variant
- Background 
- Surface 
- Error 
- On primary 
- On Secondary
- On Background
- On Surface 
- On Error
Pour la palette de couleurs numéro 1, fais une palette avec les couleurs noirs et violettes.

###Indications globales de style
[Important] Tu dois toujours respecter le style et les méthodes dans https://m3.material.io/
[Important]  Utilise des composant de react, comme on peut trouver sur le site https://reactbits.dev/
Utilise un style légé et moderne, c'est un online tool qu'on est en train de faire pour rappel.
Tu devras faire du Glassmorphism dès que tu en vois l'occasion.
Ajoutes des toutes petites animations si tu en vois l'opportunité.


## Colonne 1
Dans cette colonne, tu va créer un calculateur de plan d'adressage hiérarchique IPv4.
Pour cela, utilise la méthode décrite dans le cahier des charges (méthode JLD).
Dans cette colonne, il y aura un champ vide dans lequel tu fournira la plage IPv4 utilisable par le calculateur.
Il y aura aussi un champ dans lequel préciser le nombre d'adresses dans le 1er sous réseau.
Une fois ce nombre entré, un nouveau champs appraraitra, plaçant le curseur de l'utililisateur dedans directement.
Ce nouveau champ permettra de préciser le nombre d'adresses utilisable dans le deuxième sous réseau et ainsi de suite.
Fais en sorte que à chauqe fois que l'on entre un nouveau sous réseau (le nombre d'adresses utilisables dans ce réseau),
le résultat apparaisse automatiquement sans que l'utilisateur ait à préciser d'appuyer sur calculer.
Me résultat s'affichera sous la forme suivante: Une ligne par sous réseau avec l'adresse et le masque de ce sous-réseau:
exemple: Sous réseau 1 : 192.168.1.0/24
Sous réseau 1 : 192.168.2.0/24
Sous réseau 1 : 192.168.3.0/24


## Colonne 2
Dans cette colonne, tu créera un outil pour résumer des routes.
Pour cela, Il y aura un champ vide dans lequel l'utilisateur précisera le premier réseau à résumer,
Lorsq'il appuie sur entrée, le calcul de la route résumée s'effectuera, un nouveau champ vide sera crée et le curseur de l'utilisateur  sera placé dans ce champ.
Le Calcul du résumé de route s'effectuera à partir de tous les champs remplis. Exemple:
192.168.1.0/24
192.168.255.0/24
"Champ vide crée automatiquement après que l'utilisateur ait validé le champ au dessus.
Résumé de route:192.168.0.0/16

## Colonne 3
Cette colonne correspond à la feature numéro 3
BUT : Donner des informations sur ce que entre l'utilisateur
Composant :
- un champ pour une adresse ipv4, le format sera <adresse_ipv4>/<CIDR>
- Un composant comportant un tas d'informations sur l'adresse ip
Dans le composant avec les informations on peut retrouver 
- une "progressbar", la description détaillée se trouve dans la section "Decription de la progressbar" dans le fichier du cahier des charges
D'auteres informations comme : Adresse réseau/masque, nombre ip disponible, nombre ip utilisé, plus grande plage disponible, plus petite, prochain réseau, masque en version longue, et en wildcard -Type d'adresse (privé/public/cgnat/documentation/multicast etc.). La classe d'ip aussi.
Pour savoir à quel type d'adersses l'adresse entrée par l'utilisateur correspond, tu devras utiliser une base de données de type document. Clée ip unique ou une range d'ip valeur type.






