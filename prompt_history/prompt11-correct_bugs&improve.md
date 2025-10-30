[IMPORTANT] Assure toi de lire le fichier "AGENTS.md"
# Global
- Ajoute un id à tous les éléments
Corrige la couleur de l'octet (quand le masque coupe au milieu) de l'élément "inspecting" de la section IPv4 Insight Panel, il y a le même problème sur l'élément "Result" de la sous section Address explorer de la méthode 2 de Hierarchical IPv4 Plan. Pour corriger ce problème tu peux de référé à la méthode présente pour affichier "formula" de la la méthode 2 de la section 1

# Section : IPv4 Insight Panel
- La progress-indicator doit être proportionnel au nombre total d'hôtes.
- le span dans progress-indicator doit avoir les octets de fin de l'adresse entrée. (octet contenant de la partie hôte, ne serait-ce qu'un peut). Attention au style, le texte doit faire élargie la bulle horizontalement. La couleur du texte doit être de la même couleur que la partie hôte. tu peux lui mettre l'id "span-bulle"

- Cette même bulle doit pouvoir se drag sur la totalité de la progress bar, comme pour le slider de la méthode 2 de la section1.
- L'endpoint gauche sous la barre de progression doit être de la couleur --layer-color-b
- L'endpoint droit sous la barre de progression doit être de la couleur --layer-color-c
- Si l'utilisateur entre l'adresse du réseau, span-bulle doit être de la couleur --layer-color-b
- Si l'utilisateur entre l'adresse du broadcast, span-bulle doit être de la couleur --layer-color-c
- boundary-count, en dessous du binary-octet doit être sous le format suivant "/<CIDR> = <actual_sum>

- Si c'est une adresse multicast qu'il entre, affiche à quel service cette adresse appartient.
  Pour ce faire, Ajoute un fichier qui te servira de basse de données pour tous les types d'adresse IP. Optimise.
- En dessous De la progress bar avec inspecting et net brd, ajoute une colonne pour afficher tous les insight-title sur deux colonnes

# Section Hierarchical IPv4 Plan - Method 2 
- slider-track doit être un peu plus bas ( pour pas slider-handle-label ne chauvauche les boutons)
- le span ayant les classes "readable-tag is-readable" Doit être sur une seule ligne.
- Le div de la formula, avec l'astuce ipv6 doit être en haut de la result-card
- le details Address Explorer doit être juste en dessous
- Le plan overview peut être remplacé par quelque chose que tu trouves plus pertinent d'afficher. (évite d'afficher des doublons ou des choses qu'on peut facilement deviner)