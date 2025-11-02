[IMPORTANT] Make sure to read the file "AGENTS.md"
# Global
- Ajoute un id sur presque tous les éléments html, l'id doit correspondre à la fonction de l'élément.

## IPv4 Insight Panel
- dans cidr-display de la section ipv4 insignt pannel, quand le masque n'est pas difisible par huit, la partie hôte est sous lignée, enlève uniquement ce souslignement. Le même problème est sur la méthode 2 adress explorer.
- le progress-indicator est buggé, il ne bouge pas, le style est cassé Le style doit être comme la bulle blanche comme présente dans la version 21da971 de git, cela fait partie des bugs que tu dois résoudre.
- dans la partie boundary-count, uniquement le chiffre après le + doit être coloré.
## Hierarchical IPv4 Plan - method 2
- Supprime totalement la section Key Metrics 
- Dans la partie layer breakdown enlèves toutes les informations des éléments "result-meta"
- Adresse explorer doit être cliquable sur toute la largeur et pas uniquement sur le text, ceci doit être valable pour tous les futures sections depliables.

## Hierarchical IPv4 Plan - method 1
- Dans la méthode 1 - Host sizing l'élément count dépasse à certains à certaiens largeur d'écran. Essaye de fixer inteligement cet affichage.
- ce même élément de doit pas avoir de valeur par défaut.

# Design
Arrange la disposition et les proportions du logo, titre, et sa description
