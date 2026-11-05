# Canal – Annuaire-organigramme (maquette)

Maquette d'un nouvel onglet **Annuaire** pour l'intranet Canal de la ville de Tourcoing, proposée par des élèves attachés de l'IRA de Lille à l'issue des entretiens de la Semaine de la transformation publique (novembre 2026).

> **Données fictives.** La structure (DGS, DGAS, DGST et directions) reprend l'organigramme de la ville de septembre 2026. Les services, les **486 agents**, leurs coordonnées et leurs rattachements aux projets sont **inventés**.

## Ce que montre la maquette

| Onglet | Fonction |
|---|---|
| **Rechercher** | Recherche par mot-clé dans les noms, postes, missions, mots-clés, services et projets (« mécénat », « tournage », « chauffage »…), avec filtres par direction et par projet, et surlignage des correspondances. |
| **Fiche agent** | Un clic sur un agent : poste, missions, mots-clés, projets, coordonnées, responsable et collègues, et **fil d'Ariane cliquable** de sa position (Ville › DGS › DGAS › Direction › Service). |
| **Organigramme** | Vue d'ensemble du haut de l'organigramme, puis navigation en colonnes (pôle → direction → service → agents). Sur téléphone, une seule colonne avec bouton retour. |
| **Projets** | Tags projets (Tourcoing Plage, Cité éducative, Label 100 % EAC…) : chaque projet affiche son équipe **groupée par direction**. |
| **Avant / après** | La même recherche dans l'annuaire actuel (nom ou prénom uniquement) et dans l'annuaire proposé. |
| **Cas d'usage** | Six situations tirées des entretiens, chacune avec une démonstration en un clic. |
| **Mode gestionnaire** | Simule la mise à jour des fiches par chaque direction (ajout ou retrait de mots-clés et de projets). Rien n'est enregistré. |

Les autres pastilles (Messagerie, GLPI…) et les boutons de l'accueil sont hors du périmètre de la maquette.

## Technique

- Site statique, sans dépendance ni étape de compilation : `index.html`, `assets/style.css`, `assets/app.js`, `assets/data.js`.
- `assets/data.js` est généré par `node scripts/generate-data.mjs`. Le générateur est déterministe : la structure, les services, les mots-clés et les projets se modifient dans ce script.
- Routage par ancre (`#annuaire`, `#organigramme`, `#projets`, `#projet-tourcoing-plage`, `#avant-apres`, `#cas-usage`, `#agent-a123`).

## Mise en ligne

GitHub Pages : *Settings → Pages → Deploy from a branch → `main` / root*.
En local : ouvrir `index.html` dans un navigateur.
