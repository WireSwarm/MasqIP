[IMPORTANT] Make sure to read the file "AGENTS.md"
# Global
## IPv4 Insight Panel - progress-wrapper
* l'élément ipv4-progress-indicator doit être positionné sur la progress-track selon la règle de proportionnalité suivante :
- la position de l'adresse ip entrée par l'utilisateur par rapport à la taille totale du réseau.
Par exemple, si l'ip entrée est "192.168.1.125/24", ipv4-progress-indicator doit être situéau le milieu car il y a 127 est vers le milieu de 256. 
Sur ipv4-insight-progress-track, il doit y avoir 2 couleurs, la couleur proche du violet doit representer la partie réseau et est donc à la gauche de ipv4-progress-indicator, à l'inverse la couleur proche de l'orange représente la partie hôte et doit par conséquences ce situer à droite de ipv4-progress-indicator
