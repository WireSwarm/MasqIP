[IMPORTANT] Make sure to read the file "AGENTS.md"
# Ajout d'une feature
BUT : Changement UX pour avertir l'utilisateur quand le format n'est pas valide
L'information de la validation doit se faire non plus avec le message dans un autre bloc (invalid format etc.) mais avec le hover de la souris directement sur l'input.
Il y a 2 effets visuel quand un champ est invalid
- Cas1 : Invalid mais avec le focus -> Trainée rouge qui tourne autour de l'input. J'ai trouvé une implémentation déjà existante sur un de mes projet. Tu peux trouver les 3 fichier de mon implémentation dans le  dossier  trails_code_example. Pour implémenter correctemetn ce code, tu dois comprendre exactement ce qu'il fait, ensuite tu dois l'adapter à l'input.
- Cas2 : Invalide sans le focus -> bordure rouge constante