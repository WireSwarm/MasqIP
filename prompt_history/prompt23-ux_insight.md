[IMPORTANT] Make sure to read the file "AGENTS.md"
# Amélioration de l'ux sur ipv4 insigh pannel
* les ipv4-insight-entry-card ne doivent pas apparaître si aucune adresse ip est entrée
* le changement d'input avec le focus ne doit pas faire de scroll automatique
* Le scroll automatique vers l'input est fait qu'une fois que l'utilisateur commence à écrire. (et ça doit être de préférence vers le milieu de l'écran)
* ipv4-insight-entry-card pour une adresse ip sans cidr (ou avec un /32) ne doit afficher uniquement les informations suivantes :
 - Classe et type.
Il ne doit même pas y avoir de progress bar pour les adresse ip sans masque (/32)
