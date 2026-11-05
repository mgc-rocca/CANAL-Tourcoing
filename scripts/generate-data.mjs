// Génère assets/data.js : structure réelle (organigramme CST, septembre 2026) jusqu'aux directions,
// services vraisemblables et agents FICTIFS. Déterministe (graine fixe) : relancer donne le même résultat.
// Usage : node scripts/generate-data.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let seed = 20261105;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// ---------- Noms fictifs ----------
const PRENOMS_F = ['Amélie','Anaïs','Audrey','Aurélie','Camille','Caroline','Céline','Chloé','Claire','Delphine','Élodie','Émilie','Fanny','Fatima','Hélène','Inès','Isabelle','Jeanne','Julie','Karima','Laëtitia','Laura','Léa','Lucie','Manon','Marie','Mathilde','Morgane','Nadia','Nathalie','Noémie','Pauline','Sabrina','Samia','Sarah','Sophie','Stéphanie','Valérie','Virginie','Yasmine','Agnès','Bérénice','Coralie','Estelle','Gaëlle','Justine','Lina','Maëlle','Océane','Solène'];
const PRENOMS_M = ['Adrien','Alexandre','Antoine','Arnaud','Benoît','Bruno','Christophe','Damien','David','Fabrice','François','Grégory','Guillaume','Hugo','Jérôme','Julien','Karim','Kévin','Laurent','Louis','Mathieu','Maxime','Mehdi','Nicolas','Olivier','Pascal','Patrick','Philippe','Quentin','Rachid','Romain','Samuel','Sébastien','Stéphane','Thomas','Vincent','Xavier','Yann','Yassine','Bastien','Cédric','Dimitri','Florian','Jonathan','Ludovic','Mickaël','Noël','Thibault','Valentin','Yohan'];
const NOMS = ['Achour','Bauduin','Becquart','Bensaïd','Berteloot','Bocquet','Bouchez','Bourgeois','Brabant','Carlier','Castelain','Catteau','Coolen','Courtecuisse','Cuvelier','Debève','Declercq','Defrance','Dehaene','Delannoy','Delattre','Delcroix','Deleplanque','Delobel','Demeulenaere','Denis','Derache','Descamps','Desmet','Devos','Dhalluin','Dubrulle','Duhamel','Dumortier','Duquesne','Durieux','El Amrani','Facon','Flamand','Fournier','Gheysens','Gruson','Haddad','Hennion','Herbaut','Hoste','Huysman','Lagache','Lambin','Lebrun','Lecomte','Lefebvre','Lemaire','Lepers','Leroy','Lesaffre','Loridan','Maes','Mahieu','Mairesse','Masquelier','Meziane','Michiels','Mortier','Nowak','Ouali','Parmentier','Petitprez','Plouvier','Ramery','Ryckebusch','Saïdi','Sergeant','Six','Tack','Tavernier','Thery','Vandamme','Vandenbussche','Vanhoutte','Verbeke','Verhaeghe','Vermeersch','Wallart','Wattel','Wauquier','Ziani','Zitouni','Bekaert','Caron','Dufour','Gallois','Hespel','Joly','Kowalski','Lallart','Mercier','Pollet','Roussel'];
const used = new Set();
function person(gender) {
  for (let k = 0; k < 200; k++) {
    const g = gender || (rnd() < 0.58 ? 'f' : 'm');
    const prenom = pick(g === 'f' ? PRENOMS_F : PRENOMS_M), nom = pick(NOMS);
    const key = prenom + ' ' + nom;
    if (!used.has(key)) { used.add(key); return { prenom, nom, g }; }
  }
  throw new Error('plus de noms disponibles');
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const fem = (title, g) => title.replace(/(\p{L}+)·(\p{L}+)/gu, (_, stem, suf) => {
  if (g !== 'f') return stem;
  switch (suf) {
    case 'ère': return stem.replace(/er$/, '') + 'ère';
    case 'rice': return stem.replace(/eur$/, '') + 'rice';
    case 'se': return stem.replace(/eur$/, '') + 'euse';
    case 've': return stem.replace(/f$/, '') + 've';
    case 'que': return stem.replace(/c$/, '') + 'que';
    default: return stem + suf; // e, le, ne, fe, que
  }
});

// ---------- Structure ----------
// Service : [id, nom, mots-clés, postes, missions, lieu?]
const S = (id, nom, kw, roles, missions, lieu) => ({ id, nom, kw: kw.split(', '), roles: roles.split('|'), missions: missions.split('|'), lieu });
const HDV = 'Hôtel de ville';

const TREE = {
  id: 'ville', type: 'ville', nom: 'Ville de Tourcoing', children: [
  { id: 'maire', type: 'pole', nom: 'Maire', sigle: 'Maire', children: [
    { id: 'cab', type: 'direction', nom: 'Cabinet du maire', lieu: HDV, services: [
      S('cab-sec', 'Secrétariat du cabinet', 'agenda du maire, courrier, invitations, rendez-vous, parapheur', 'Assistant·e de cabinet|Chargé·e du courrier|Secrétaire', 'Gérer l’agenda du maire|Traiter le courrier adressé au maire|Organiser les rendez-vous et les invitations|Préparer les parapheurs'),
      S('cab-proto', 'Protocole et relations publiques', 'protocole, cérémonies, réceptions, jumelages, commémorations, vœux', 'Chargé·e du protocole|Chargé·e des relations publiques|Agent·e d’accueil protocolaire', 'Organiser les cérémonies et commémorations|Préparer les réceptions officielles|Suivre les jumelages|Gérer les listes protocolaires'),
    ]},
    { id: 'ccas', type: 'direction', nom: 'Centre communal d’action sociale', sigle: 'CCAS', lieu: 'CCAS', services: [
      S('ccas-acc', 'Accueil et accès aux droits', 'aides sociales, domiciliation, RSA, aides facultatives, accès aux droits, précarité', 'Travailleur·se social·e|Conseiller·ère en économie sociale et familiale|Agent·e d’accueil social', 'Accueillir et orienter le public|Instruire les demandes d’aides facultatives|Assurer la domiciliation administrative|Accompagner l’accès aux droits'),
      S('ccas-sen', 'Seniors et autonomie', 'seniors, personnes âgées, résidences autonomie, portage de repas, plan canicule, isolement', 'Chargé·e de l’animation seniors|Coordinateur·rice autonomie|Agent·e de convivialité', 'Animer les activités pour les seniors|Coordonner le portage de repas à domicile|Piloter le registre canicule|Lutter contre l’isolement des personnes âgées'),
      S('ccas-ins', 'Insertion et logement', 'insertion, hébergement d’urgence, logement, accompagnement, emploi', 'Chargé·e d’insertion|Référent·e logement|Travailleur·se social·e', 'Accompagner les publics vers l’emploi|Orienter vers l’hébergement d’urgence|Suivre les demandes de logement social'),
    ]},
  ]},
  { id: 'dgs', type: 'pole', nom: 'Direction générale des services', sigle: 'DGS', children: [
    { id: 'drh', type: 'direction', nom: 'Direction des ressources humaines', sigle: 'DRH', lieu: HDV, services: [
      S('drh-paie', 'Carrière et paie', 'paie, carrière, avancement, positions statutaires, arrêtés individuels, retraite', 'Gestionnaire carrière-paie|Gestionnaire retraite|Chargé·e de la masse salariale', 'Préparer la paie mensuelle|Instruire les avancements et promotions|Rédiger les arrêtés individuels|Préparer les dossiers de retraite'),
      S('drh-rec', 'Recrutement et mobilité', 'recrutement, fiches de poste, jurys, mobilité interne, saisonniers, animateurs, offres d’emploi', 'Chargé·e de recrutement|Conseiller·ère mobilité|Gestionnaire recrutement', 'Publier les offres d’emploi|Organiser les jurys de recrutement|Accompagner la mobilité interne|Recruter les animateurs saisonniers'),
      S('drh-form', 'Formation', 'formation, CNFPT, plan de formation, absence formation, formulaire, compte personnel de formation, accueil des nouveaux arrivants', 'Chargé·e de formation|Gestionnaire formation', 'Construire le plan de formation|Inscrire les agents aux formations CNFPT|Gérer les absences pour formation|Organiser la journée des nouveaux arrivants'),
      S('drh-qvt', 'Santé et qualité de vie au travail', 'qualité de vie au travail, prévention des risques, médecine préventive, absentéisme, handicap, reclassement', 'Conseiller·ère prévention|Chargé·e de la qualité de vie au travail|Référent·e handicap', 'Prévenir les risques professionnels|Suivre l’absentéisme|Accompagner les reclassements|Animer la démarche qualité de vie au travail'),
      S('drh-ds', 'Dialogue social', 'dialogue social, CST, F3SCT, syndicats, élections professionnelles', 'Chargé·e du dialogue social', 'Préparer le comité social territorial|Organiser les élections professionnelles|Suivre les relations avec les organisations syndicales'),
    ]},
    { id: 'dce', type: 'direction', nom: 'Direction de la communication et de l’évènementiel', lieu: HDV, services: [
      S('dce-ext', 'Communication externe', 'magazine municipal, réseaux sociaux, site internet, presse, relations presse', 'Chargé·e de communication|Community manager|Rédacteur·rice', 'Rédiger le magazine municipal|Animer les réseaux sociaux de la ville|Mettre à jour le site internet|Gérer les relations presse'),
      S('dce-int', 'Communication interne', 'intranet, Canal, lettre interne, annuaire, journée des nouveaux arrivants, actualités agents', 'Chargé·e de communication interne|Webmestre intranet', 'Animer l’intranet Canal|Publier les actualités internes|Tenir l’annuaire des agents|Co-organiser la journée des nouveaux arrivants'),
      S('dce-evt', 'Évènementiel', 'évènementiel, grands événements, Tourcoing Plage, fêtes, calendrier des manifestations, braderie, marché de Noël', 'Chargé·e d’évènementiel|Régisseur·se événementiel|Coordinateur·rice des manifestations', 'Organiser les grands événements de la ville|Tenir le calendrier des manifestations|Coordonner les services le jour J|Assurer la maîtrise d’ouvrage de Tourcoing Plage'),
      S('dce-graph', 'Studio graphique', 'graphisme, affiches, charte graphique, signalétique, impression, photos', 'Graphiste|Photographe|Chargé·e de la signalétique', 'Créer les affiches et supports|Faire respecter la charte graphique|Concevoir la signalétique'),
    ]},
    { id: 'drhva', type: 'direction', nom: 'Direction des relations aux habitants et de la vie associative', lieu: HDV, services: [
      S('rha-dem', 'Démocratie participative', 'concertation, conseils de quartier, démocratie participative, budget participatif, réunions publiques', 'Chargé·e de concertation|Animateur·rice de quartier', 'Animer les conseils de quartier|Organiser les concertations d’habitants|Préparer les réunions publiques'),
      S('rha-quart', 'Mairies de quartier', 'mairies de quartier, accueil de proximité, guichet, démarches, quartiers', 'Agent·e d’accueil de proximité|Responsable de mairie de quartier', 'Accueillir les habitants dans les quartiers|Relayer les demandes vers les services|Assurer les démarches de proximité', 'Mairie de quartier'),
      S('rha-asso', 'Vie associative', 'associations, subventions aux associations, prêt de salles, maison des associations, bénévolat', 'Chargé·e de la vie associative|Gestionnaire des subventions|Gestionnaire des salles', 'Instruire les demandes de subvention|Gérer le prêt de salles aux associations|Accompagner les associations', 'Maison des associations'),
    ]},
    { id: 'dag', type: 'direction', nom: 'Direction de l’administration générale', lieu: HDV, services: [
      S('dag-cour', 'Courrier et archives administratives', 'courrier, archivage, gestion électronique des documents, dématérialisation', 'Agent·e du courrier|Archiviste|Gestionnaire GED', 'Trier et distribuer le courrier|Archiver les dossiers des services|Accompagner la dématérialisation'),
      S('dag-ass', 'Assurances et affaires générales', 'assurances, sinistres, responsabilité civile, flotte, affaires générales', 'Gestionnaire assurances|Chargé·e des affaires générales', 'Déclarer et suivre les sinistres|Gérer les contrats d’assurance'),
    ]},
    // ----- DGAS Ressources internes et modernisation -----
    { id: 'dgas-rim', type: 'dgas', nom: 'DGAS Ressources internes et modernisation', sigle: 'DGAS RIM', children: [
      { id: 'cpa', type: 'direction', nom: 'Cellule de la commande publique et des achats', lieu: HDV, services: [
        S('cpa-mp', 'Marchés publics', 'marchés publics, appels d’offres, consultation, DCE, procédures, accords-cadres', 'Juriste marchés publics|Gestionnaire marchés publics|Acheteur·se public·que', 'Rédiger les dossiers de consultation|Sécuriser les procédures de marché|Accompagner les services acheteurs|Analyser les offres'),
        S('cpa-ach', 'Achats', 'achats, fournitures, catalogue, bons de commande, devis, accords-cadres', 'Acheteur·se|Gestionnaire achats', 'Tenir le catalogue des achats|Négocier avec les fournisseurs|Conseiller les services sur leurs commandes'),
      ]},
      { id: 'aud', type: 'direction', nom: 'Direction de l’audit et de l’évaluation des politiques publiques', lieu: HDV, services: [
        S('aud-audit', 'Audit interne', 'audit, contrôle interne, organisation, risques, transformation', 'Auditeur·rice interne|Chargé·e de mission organisation', 'Conduire les audits d’organisation|Cartographier les risques|Accompagner la transformation des services'),
        S('aud-eval', 'Évaluation des politiques publiques', 'évaluation, indicateurs, politiques publiques, enquêtes, transversalité, Semaine de la transformation publique', 'Chargé·e d’évaluation|Chargé·e d’études', 'Évaluer les politiques publiques|Construire les indicateurs de suivi|Mener des enquêtes auprès des usagers et des agents'),
        S('aud-data', 'Données et observatoire', 'données, tableaux de bord, open data, statistiques, observatoire, cartographie', 'Data analyste|Chargé·e d’observatoire|Géomaticien·ne', 'Produire les tableaux de bord|Publier les données ouvertes|Animer l’observatoire territorial'),
      ]},
      { id: 'jur', type: 'direction', nom: 'Direction des affaires juridiques et des assemblées', lieu: HDV, services: [
        S('jur-cons', 'Conseil juridique et contentieux', 'conseil juridique, contentieux, conventions, contrats, RGPD, précontentieux', 'Juriste|Délégué·e à la protection des données', 'Conseiller les services sur le plan juridique|Suivre les contentieux|Relire les conventions|Veiller au respect du RGPD'),
        S('jur-ass', 'Assemblées', 'conseil municipal, délibérations, arrêtés, actes, commissions', 'Gestionnaire des assemblées|Assistant·e des assemblées', 'Préparer le conseil municipal|Publier les délibérations et arrêtés|Organiser les commissions'),
      ]},
      { id: 'cdg', type: 'direction', nom: 'Direction du contrôle de gestion', lieu: HDV, services: [
        S('cdg-cg', 'Contrôle de gestion', 'contrôle de gestion, coûts, tableaux de bord, satellites, associations subventionnées, analyse financière', 'Contrôleur·se de gestion|Analyste financier·ère', 'Calculer les coûts des services|Contrôler les satellites et associations subventionnées|Produire les tableaux de bord de gestion'),
      ]},
      { id: 'fin', type: 'direction', nom: 'Direction des finances', lieu: HDV, services: [
        S('fin-bud', 'Budget', 'budget, préparation budgétaire, calendrier budgétaire, budget primitif, décision modificative, prospective', 'Chargé·e de préparation budgétaire|Analyste budgétaire', 'Piloter la préparation budgétaire|Fixer le calendrier budgétaire|Préparer le budget primitif et les décisions modificatives'),
        S('fin-exe', 'Exécution comptable', 'mandats, titres, factures, Chorus Pro, comptabilité, régies', 'Gestionnaire comptable|Régisseur·se', 'Mandater les factures|Émettre les titres de recettes|Contrôler les régies'),
        S('fin-sub', 'Recherche de financements', 'subventions, appels à projets, financements, FEDER, CAF, Europe, cofinancements', 'Chargé·e de recherche de financements|Chargé·e de mission fonds européens', 'Repérer les appels à projets|Monter les dossiers de subvention|Suivre les fonds européens'),
      ]},
      { id: 'log', type: 'direction', nom: 'Direction de la logistique', lieu: 'Centre technique municipal', services: [
        S('log-pret', 'Prêt de matériel', 'prêt de matériel, tables, chaises, barnums, podiums, sonorisation, réservations', 'Gestionnaire du prêt de matériel|Agent·e logistique|Magasinier·ère', 'Gérer les réservations de matériel|Préparer et livrer le matériel|Tenir le stock'),
        S('log-auto', 'Parc automobile', 'véhicules, parc automobile, pool, carburant, entretien véhicules', 'Gestionnaire du parc automobile|Mécanicien·ne', 'Gérer le pool de véhicules|Assurer l’entretien des véhicules|Suivre les cartes carburant'),
        S('log-ent', 'Entretien des locaux', 'ménage, entretien des locaux, aspirateur, produits d’entretien, nettoyage', 'Agent·e d’entretien|Chef·fe d’équipe entretien', 'Assurer l’entretien des bâtiments administratifs|Fournir le matériel et les produits d’entretien|Organiser les plannings de ménage'),
        S('log-repro', 'Reprographie et courrier interne', 'reprographie, impression, photocopies, navette courrier', 'Agent·e de reprographie|Agent·e de la navette', 'Imprimer les documents des services|Assurer la navette du courrier interne'),
      ]},
      { id: 'dsin', type: 'direction', nom: 'Direction des systèmes d’information et du numérique', sigle: 'DSIN', lieu: HDV, services: [
        S('dsin-ass', 'Assistance utilisateurs', 'hotline 3333, GLPI, tickets, assistance, PC, imprimantes, mots de passe, téléphonie', 'Technicien·ne support|Technicien·ne de proximité|Chargé·e de la téléphonie', 'Répondre à la hotline numérique|Traiter les tickets GLPI|Installer les postes de travail|Gérer la téléphonie'),
        S('dsin-infra', 'Infrastructures et sécurité', 'réseau, serveurs, cybersécurité, SecOps, sauvegardes, messagerie, sécurité des outils', 'Administrateur·rice systèmes et réseaux|Responsable de la sécurité des systèmes d’information', 'Administrer les serveurs et le réseau|Assurer la cybersécurité|Gérer la messagerie|Sensibiliser les agents à la sécurité des outils'),
        S('dsin-app', 'Applications métiers', 'logiciels métiers, Fusion, Technocarte, Cyril, LEA, Aztèque, Coop Office, paramétrage', 'Chef·fe de projet applicatif|Administrateur·rice d’applications', 'Paramétrer les logiciels métiers|Gérer les accès aux applications|Former les référents applicatifs'),
        S('dsin-proj', 'Projets numériques', 'projets numériques, intranet, intelligence artificielle, IA, dématérialisation, achats de logiciels, équipements', 'Chef·fe de projet numérique|Chargé·e des achats informatiques', 'Conduire les projets numériques|Piloter les achats de logiciels et d’équipements|Expérimenter les usages de l’IA'),
      ]},
    ]},
    // ----- DGAS Proximité -----
    { id: 'dgas-prox', type: 'dgas', nom: 'DGAS Proximité', sigle: 'DGAS Proximité', children: [
      { id: 'ecf', type: 'direction', nom: 'Direction des écoles et familles', lieu: HDV, services: [
        S('ecf-sco', 'Vie scolaire', 'inscriptions scolaires, carte scolaire, ATSEM, écoles, dérogations', 'Gestionnaire vie scolaire|Coordinateur·rice ATSEM', 'Gérer les inscriptions et la carte scolaire|Coordonner les ATSEM|Instruire les dérogations', 'Écoles'),
        S('ecf-bat', 'Bâtiments scolaires', 'bâtiments scolaires, LEA, tickets, travaux dans les écoles, sécurité des écoles', 'Référent·e bâtiments scolaires|Gestionnaire LEA', 'Centraliser les demandes des écoles via LEA|Programmer les travaux dans les écoles|Suivre la sécurité des bâtiments scolaires'),
        S('ecf-peri', 'Périscolaire', 'périscolaire, garderie, accueil du matin, études surveillées, pause méridienne', 'Coordinateur·rice périscolaire|Animateur·rice périscolaire', 'Organiser les accueils périscolaires|Encadrer la pause méridienne|Recruter et former les animateurs périscolaires', 'Écoles'),
        S('ecf-fam', 'Guichet familles', 'guichet unique, Technocarte, facturation, inscriptions cantine, quotient familial, portail famille', 'Agent·e du guichet familles|Gestionnaire facturation', 'Accueillir les familles|Gérer les inscriptions dans Technocarte|Établir la facturation des familles'),
      ]},
      { id: 'ejp', type: 'direction', nom: 'Direction de l’enfance, de la jeunesse, des centres sociaux et de la politique de la ville', lieu: HDV, services: [
        S('ejp-alsh', 'Centres de loisirs', 'centres de loisirs, ALSH, accueil de loisirs, vacances, mercredis, séjours', 'Coordinateur·rice des accueils de loisirs|Directeur·rice d’accueil de loisirs|Animateur·rice', 'Organiser les accueils de loisirs des mercredis et vacances|Encadrer les équipes d’animation|Coordonner l’usage des bâtiments communaux', 'Accueils de loisirs'),
        S('ejp-jeun', 'Jeunesse', 'jeunesse, Point information jeunesse, Quartier Libre, animateurs, Tourcoing Plage, 16-25 ans', 'Animateur·rice jeunesse|Informateur·rice jeunesse|Coordinateur·rice jeunesse', 'Animer les actions jeunesse|Informer les jeunes (Point information jeunesse)|Coordonner l’animation de Tourcoing Plage|Suivre le dispositif Quartier Libre', 'Espaces jeunesse'),
        S('ejp-cs', 'Centres sociaux', 'centres sociaux, conventions, financements, associations, animation de la vie sociale', 'Chargé·e de mission centres sociaux', 'Suivre les conventions avec les centres sociaux|Instruire leurs financements|Animer le réseau des centres sociaux'),
        S('ejp-pv', 'Politique de la ville', 'politique de la ville, contrat de ville, quartiers prioritaires, cité éducative, appels à projets', 'Chef·fe de projet politique de la ville|Chargé·e de développement social urbain|Coordinateur·rice cité éducative', 'Piloter le contrat de ville|Animer la cité éducative|Instruire les appels à projets politique de la ville'),
        S('ejp-contr', 'Contractualisation', 'PEDT, CTG, convention territoriale globale, projet éducatif de territoire, CAF, contrats territoriaux', 'Chargé·e de contractualisation|Chargé·e de mission CAF', 'Piloter le projet éducatif de territoire|Suivre la convention territoriale globale avec la CAF|Cartographier les acteurs des contrats territoriaux'),
      ]},
      { id: 'pep', type: 'direction', nom: 'Direction de la petite enfance et de la parentalité', lieu: HDV, services: [
        S('pep-creche', 'Crèches municipales', 'crèches, multi-accueil, places en crèche, commission d’attribution, directrices de crèche, auxiliaires de puériculture', 'Directeur·rice de crèche|Auxiliaire de puériculture|Éducateur·rice de jeunes enfants', 'Accueillir les jeunes enfants|Encadrer les équipes de crèche|Préparer la commission d’attribution des places', 'Crèches'),
        S('pep-fam', 'Crèche familiale', 'crèche familiale, assistantes maternelles municipales, accueil à domicile, temps collectifs', 'Directeur·rice de la crèche familiale|Éducateur·rice de jeunes enfants', 'Accompagner les assistantes maternelles municipales|Organiser les temps collectifs|Suivre l’accueil des enfants à domicile', 'Crèche familiale'),
        S('pep-rpe', 'Relais petite enfance', 'relais petite enfance, RPE, assistantes maternelles, modes de garde, cité éducative petite enfance', 'Animateur·rice du relais petite enfance|Responsable du relais petite enfance', 'Informer les parents sur les modes de garde|Animer le réseau des assistantes maternelles|Porter les projets petite enfance de la cité éducative', 'Relais petite enfance'),
        S('pep-par', 'Parentalité', 'parentalité, soutien à la parentalité, lieu d’accueil enfants-parents, LAEP, Mois de la petite enfance', 'Chargé·e de mission parentalité|Accueillant·e LAEP', 'Animer le lieu d’accueil enfants-parents|Coordonner le Mois de la petite enfance|Développer les actions de soutien à la parentalité'),
      ]},
      { id: 'rest', type: 'direction', nom: 'Direction de la restauration', lieu: 'Cuisine centrale', services: [
        S('rest-prod', 'Cuisine centrale', 'cuisine centrale, production de repas, menus, cantine, repas des écoles, EHPAD, crèches', 'Chef·fe de production|Cuisinier·ère|Agent·e de restauration', 'Produire les repas de tous les établissements de la ville|Élaborer les menus|Assurer la production quotidienne'),
        S('rest-cmd', 'Commandes et livraisons', 'commandes de repas, Fusion, livraisons, effectifs, logistique repas', 'Gestionnaire des commandes|Chauffeur·se-livreur·se', 'Centraliser les commandes de repas dans Fusion|Organiser les livraisons|Ajuster les effectifs'),
        S('rest-qual', 'Diététique et qualité', 'diététique, nutrition, allergies, PAI, hygiène, HACCP, loi EGalim, produits locaux', 'Diététicien·ne|Responsable qualité-hygiène', 'Garantir l’équilibre nutritionnel|Gérer les régimes et allergies (PAI)|Contrôler l’hygiène (HACCP)|Développer les produits locaux (EGalim)'),
      ]},
      { id: 'sec', type: 'direction', nom: 'Direction de la sécurité publique, de la prévention et de l’accès aux droits', lieu: 'Hôtel de police municipale', services: [
        S('sec-pm', 'Police municipale', 'police municipale, tranquillité publique, sécurité des événements, stationnement, arrêtés', 'Policier·ère municipal·e|Brigadier·ère-chef·fe|Agent·e de surveillance de la voie publique', 'Assurer la tranquillité publique|Sécuriser les manifestations|Faire respecter les arrêtés du maire'),
        S('sec-csu', 'Centre de supervision urbain', 'vidéoprotection, caméras, CSU, réquisitions', 'Opérateur·rice de vidéoprotection', 'Surveiller les images de vidéoprotection|Traiter les réquisitions'),
        S('sec-prev', 'Prévention de la délinquance', 'prévention, CLSPD, médiation, médiateurs, décrochage, tranquillité', 'Coordinateur·rice CLSPD|Médiateur·rice|Chargé·e de prévention', 'Animer le conseil local de sécurité et de prévention|Coordonner les médiateurs|Prévenir le décrochage des jeunes'),
        S('sec-droit', 'Accès aux droits', 'accès aux droits, point justice, aide aux victimes, permanences juridiques', 'Chargé·e d’accueil accès aux droits', 'Organiser les permanences juridiques|Orienter vers l’aide aux victimes'),
      ]},
      { id: 'via', type: 'direction', nom: 'Direction de la vie administrative', lieu: HDV, services: [
        S('via-ec', 'État civil', 'état civil, naissances, mariages, décès, livret de famille, PACS', 'Officier·ère d’état civil|Agent·e d’état civil', 'Établir les actes d’état civil|Préparer les mariages et PACS|Délivrer les copies d’actes'),
        S('via-elec', 'Élections', 'élections, listes électorales, bureaux de vote, procurations, recensement', 'Gestionnaire des élections|Coordinateur·rice du recensement', 'Tenir les listes électorales|Organiser les bureaux de vote|Coordonner le recensement'),
        S('via-titres', 'Titres d’identité', 'passeports, cartes d’identité, CNI, rendez-vous, titres sécurisés', 'Agent·e des titres d’identité', 'Instruire les demandes de passeport et de carte d’identité|Gérer les rendez-vous'),
        S('via-cim', 'Cimetières', 'cimetières, concessions funéraires, inhumations, funéraire', 'Conservateur·rice des cimetières|Agent·e de cimetière', 'Gérer les concessions funéraires|Organiser les inhumations', 'Cimetières'),
      ]},
    ]},
    // ----- DGAS Attractivité du territoire -----
    { id: 'dgas-attr', type: 'dgas', nom: 'DGAS Attractivité du territoire', sigle: 'DGAS Attractivité', children: [
      { id: 'com', type: 'direction', nom: 'Direction du commerce et de l’attractivité', lieu: HDV, services: [
        S('com-com', 'Commerce et artisanat', 'commerce, centre-ville, marchés, droits de place, vitrines, commerçants, terrasses commerciales', 'Manager de centre-ville|Placier·ère|Chargé·e du commerce', 'Accompagner les commerçants|Gérer les marchés et droits de place|Animer le centre-ville'),
        S('com-eco', 'Développement économique', 'entreprises, implantation, emploi, développement économique, zones d’activité', 'Chargé·e de développement économique', 'Accompagner l’implantation d’entreprises|Faire le lien avec les acteurs de l’emploi'),
        S('com-mec', 'Mécénat et partenariats privés', 'mécénat, mécènes, sponsoring, partenaires privés, fondation, dons, entreprises partenaires', 'Chargé·e de mécénat|Chargé·e des partenariats privés', 'Rechercher des mécènes pour les projets de la ville|Conventionner avec les entreprises partenaires|Conseiller les services qui cherchent des financements privés'),
        S('com-tour', 'Tourisme', 'tourisme, office de tourisme, visiteurs, hébergement touristique', 'Chargé·e du tourisme', 'Développer l’offre touristique|Travailler avec l’office de tourisme'),
      ]},
      { id: 'drc', type: 'direction', nom: 'Direction du rayonnement culturel', sigle: 'DRC', lieu: HDV, services: [
        S('drc-mf', 'Maison Folie Hospice d’Havré', 'Maison Folie, expositions, spectacle vivant, salle de spectacle, programmation, jeune public, festivals, accueil d’associations', 'Responsable de la programmation|Régisseur·se|Chargé·e d’accueil des publics|Médiateur·rice culturel·le', 'Programmer expositions et spectacles|Accueillir les projets associatifs|Assurer la régie technique|Organiser les festivals jeune public', 'Maison Folie Hospice d’Havré'),
        S('drc-eac', 'Éducation artistique et culturelle', 'éducation artistique et culturelle, EAC, label 100 % EAC, CLEA, résidences d’artistes, scolaires, relations publiques, Refais ta série, éducation à l’image', 'Chargé·e des relations publiques|Coordinateur·rice EAC|Médiateur·rice culturel·le', 'Développer les partenariats avec les écoles et structures|Coordonner le contrat local d’éducation artistique|Porter le label 100 % EAC|Conduire le projet Refais ta série'),
        S('drc-med', 'Réseau des médiathèques', 'médiathèques, lecture publique, action culturelle, prêt de livres, animations, heure du conte', 'Bibliothécaire|Assistant·e de conservation|Chargé·e d’action culturelle', 'Animer la lecture publique|Programmer l’action culturelle des médiathèques|Accueillir les classes et les crèches', 'Médiathèques'),
        S('drc-cons', 'Conservatoire', 'conservatoire, musique, danse, théâtre, enseignement artistique, plannings de salles, auditions', 'Professeur·e d’enseignement artistique|Chargé·e de la scolarité|Régisseur·se', 'Enseigner la musique, la danse et le théâtre|Gérer la scolarité des élèves|Planifier les salles et les auditions', 'Conservatoire'),
        S('drc-mus', 'Musée des beaux-arts', 'musée, MUBA, collections, expositions temporaires, médiation, conservation', 'Chargé·e des collections|Médiateur·rice du musée|Régisseur·se des œuvres', 'Conserver et valoriser les collections|Préparer les expositions temporaires|Accueillir les publics', 'Musée'),
        S('drc-arch', 'Archives municipales', 'archives, patrimoine écrit, recherches historiques, salle de lecture, versements', 'Archiviste|Assistant·e d’archives', 'Collecter les archives des services|Accueillir les chercheurs|Valoriser le patrimoine écrit', 'Archives municipales'),
        S('drc-vah', 'Patrimoine – Ville d’art et d’histoire', 'patrimoine, Ville d’art et d’histoire, visites guidées, guides-conférenciers, journées du patrimoine', 'Animateur·rice de l’architecture et du patrimoine|Guide-conférencier·ère', 'Organiser les visites guidées|Préparer les journées du patrimoine|Sensibiliser au patrimoine'),
        S('drc-theatre', 'Théâtre municipal', 'théâtre, programmation, billetterie, régie, accueil des compagnies, saison culturelle', 'Chargé·e de billetterie|Régisseur·se général·e|Chargé·e de production', 'Gérer la billetterie|Accueillir les compagnies|Assurer la régie des spectacles', 'Théâtre'),
      ]},
      { id: 'spo', type: 'direction', nom: 'Direction des sports', lieu: HDV, services: [
        S('spo-equip', 'Équipements sportifs', 'gymnases, piscines, stades, planning des équipements, salles de sport, réservations', 'Gestionnaire des équipements sportifs|Agent·e d’équipement sportif|Maître-nageur·se', 'Planifier l’occupation des équipements|Assurer l’accueil dans les gymnases et piscines|Signaler les besoins de maintenance', 'Équipements sportifs'),
        S('spo-anim', 'Animation sportive', 'école municipale des sports, éducateurs sportifs, sport scolaire, sport santé, stages vacances', 'Éducateur·rice sportif·ve', 'Animer l’école municipale des sports|Intervenir dans les écoles|Proposer des stages sportifs pendant les vacances'),
        S('spo-clubs', 'Clubs et événements sportifs', 'clubs sportifs, subventions aux clubs, événements sportifs, courses, tournois', 'Chargé·e de la vie sportive', 'Accompagner les clubs|Instruire les subventions sportives|Organiser les événements sportifs'),
      ]},
    ]},
    // ----- DGAS Aménagement -----
    { id: 'dgas-amen', type: 'dgas', nom: 'DGAS Aménagement', sigle: 'DGAS Aménagement', children: [
      { id: 'urb', type: 'direction', nom: 'Direction de l’urbanisme, de l’aménagement et des grands projets', lieu: HDV, services: [
        S('urb-ads', 'Autorisations d’urbanisme', 'permis de construire, déclaration préalable, autorisations d’urbanisme, enseignes, cadastre', 'Instructeur·rice des autorisations d’urbanisme|Agent·e d’accueil urbanisme', 'Instruire les permis de construire et déclarations préalables|Renseigner les particuliers et professionnels'),
        S('urb-plan', 'Planification urbaine', 'PLU, PLUi, planification, Métropole européenne de Lille, zonage', 'Chargé·e de planification', 'Suivre le plan local d’urbanisme intercommunal avec la Métropole|Préparer les modifications de zonage'),
        S('urb-gp', 'Grands projets et renouvellement urbain', 'renouvellement urbain, NPNRU, ANRU, grands projets, aménagement, quartiers prioritaires', 'Chef·fe de projet renouvellement urbain|Chargé·e d’opérations d’aménagement', 'Piloter les projets de renouvellement urbain|Coordonner les opérations d’aménagement'),
        S('urb-fon', 'Foncier', 'foncier, acquisitions, cessions, domaine, évaluations', 'Chargé·e d’affaires foncières', 'Conduire les acquisitions et cessions|Gérer le patrimoine foncier'),
      ]},
      { id: 'hab', type: 'direction', nom: 'Direction de l’habitat et de l’hygiène', lieu: HDV, services: [
        S('hab-hab', 'Habitat', 'habitat, logement, habitat indigne, permis de louer, rénovation, copropriétés', 'Chargé·e de l’habitat|Technicien·ne habitat', 'Lutter contre l’habitat indigne|Instruire le permis de louer|Accompagner la rénovation des logements'),
        S('hab-hyg', 'Hygiène et santé publique', 'hygiène, salubrité, nuisibles, insalubrité, bruit, santé publique', 'Inspecteur·rice de salubrité|Technicien·ne hygiène', 'Traiter les plaintes de salubrité|Lutter contre les nuisibles|Contrôler l’insalubrité'),
      ]},
    ]},
    // ----- DGST -----
    { id: 'dgst', type: 'dgas', nom: 'Direction générale des services techniques', sigle: 'DGST', children: [
      { id: 'arc', type: 'direction', nom: 'Direction de l’architecture', lieu: 'Centre technique municipal', services: [
        S('arc-trav', 'Études et travaux neufs', 'travaux neufs, études, maîtrise d’œuvre, construction, réhabilitation', 'Chef·fe de projet bâtiment|Dessinateur·rice-projeteur·se', 'Conduire les études de construction et de réhabilitation|Suivre les chantiers'),
        S('arc-maint', 'Maintenance des bâtiments', 'maintenance, bâtiments, Aztèque, tickets, entretien des bâtiments, patrimoine bâti', 'Technicien·ne de maintenance|Gestionnaire du patrimoine bâti', 'Programmer la maintenance des bâtiments|Suivre les demandes dans Aztèque|Gérer le patrimoine bâti'),
        S('arc-nrj', 'Énergie et fluides', 'chauffage, chaudière, énergie, fluides, sobriété énergétique, contrats d’exploitation, température', 'Chargé·e de l’énergie|Technicien·ne chauffage', 'Suivre les installations de chauffage|Piloter la sobriété énergétique|Gérer les contrats d’exploitation'),
        S('arc-erp', 'Accessibilité et sécurité des ERP', 'accessibilité, commissions de sécurité, ERP, sécurité incendie', 'Chargé·e de la sécurité des ERP', 'Préparer les commissions de sécurité|Suivre l’accessibilité des bâtiments'),
      ]},
      { id: 'nat', type: 'direction', nom: 'Direction de la nature en ville, des espaces publics et de la mobilité', lieu: 'Centre technique municipal', services: [
        S('nat-ev', 'Espaces verts', 'espaces verts, parcs, jardins, arbres, fleurissement, élagage, jardins partagés', 'Jardinier·ère|Chef·fe d’équipe espaces verts|Élagueur·se', 'Entretenir les parcs et jardins|Assurer le fleurissement|Gérer le patrimoine arboré', 'Parcs et jardins'),
        S('nat-voirie', 'Voirie et occupation du domaine public', 'voirie, domaine public, arrêtés de circulation, autorisations de tournage, tournages, terrasses, travaux sur voirie, déménagements', 'Gestionnaire de l’occupation du domaine public|Technicien·ne voirie', 'Délivrer les autorisations d’occupation du domaine public|Instruire les autorisations de tournage|Prendre les arrêtés de circulation|Coordonner les travaux sur voirie'),
        S('nat-mob', 'Mobilité', 'mobilité, vélo, stationnement, plan de mobilité, transports, pistes cyclables', 'Chargé·e de mobilité', 'Développer les mobilités douces|Gérer la politique de stationnement'),
        S('nat-ecl', 'Éclairage public', 'éclairage public, illuminations, candélabres, éclairage de Noël', 'Électricien·ne éclairage public', 'Entretenir l’éclairage public|Installer les illuminations'),
      ]},
      { id: 'pam', type: 'direction', nom: 'Direction de la propreté et des ateliers municipaux', lieu: 'Centre technique municipal', services: [
        S('pam-prop', 'Propreté urbaine', 'propreté, balayage, dépôts sauvages, tags, déchets, corbeilles', 'Agent·e de propreté|Chef·fe d’équipe propreté', 'Assurer le balayage des rues|Enlever les dépôts sauvages et les tags'),
        S('pam-ctm', 'Centre technique municipal', 'centre technique municipal, CTM, plateforme Travaux CTM, demandes de travaux, menuiserie, plomberie, électricité, serrurerie, peinture', 'Menuisier·ère|Plombier·ère|Électricien·ne|Serrurier·ère|Gestionnaire de la plateforme Travaux CTM', 'Réaliser les petits travaux dans les bâtiments|Traiter les demandes de la plateforme Travaux CTM|Répartir les interventions entre les ateliers'),
        S('pam-fest', 'Manutention et festivités', 'manutention, festivités, montage, podiums, barnums, installation des événements, Tourcoing Plage', 'Agent·e de manutention|Chef·fe d’équipe festivités', 'Installer le matériel des manifestations|Monter les podiums et barnums|Préparer le site de Tourcoing Plage'),
      ]},
    ]},
  ]},
]};

// ---------- Projets (tags) ----------
const PROJETS = [
  { id: 'tourcoing-plage', nom: 'Tourcoing Plage', desc: 'Événement estival de trois semaines au bord du canal, depuis 23 ans : installations techniques, animation, recrutement d’une trentaine d’animateurs.', services: ['dce-evt','ejp-jeun','pam-fest','log-pret','drh-rec','sec-pm','nat-voirie','spo-anim','rest-cmd'] },
  { id: 'cite-educative', nom: 'Cité éducative', desc: 'Coalition des acteurs éducatifs dans les quartiers prioritaires, de la petite enfance à l’insertion.', services: ['ejp-pv','pep-rpe','ecf-sco','drc-eac','drc-med','sec-prev','spo-anim','aud-eval'] },
  { id: 'label-eac', nom: 'Label 100 % EAC', desc: 'Label national obtenu en 2024 : donner accès à tous les jeunes à l’éducation artistique et culturelle. Une dizaine de directions associées.', services: ['drc-eac','drc-mf','drc-cons','drc-med','drc-mus','ejp-jeun','pep-par','ecf-peri','aud-eval','nat-ev'] },
  { id: 'mois-petite-enfance', nom: 'Mois de la petite enfance', desc: 'Un mois d’animations pour les tout-petits et leurs parents, à coordonner avec la programmation jeune public.', services: ['pep-par','pep-creche','pep-rpe','pep-fam','drc-med','drc-mf','dce-ext'] },
  { id: 'quartier-libre', nom: 'Quartier Libre', desc: 'Partenariat institutionnel autour de la jeunesse avec le Département, la Région, France Travail et la mission locale.', services: ['ejp-jeun','ejp-cs','sec-prev','ccas-ins','com-eco'] },
  { id: 'contrat-de-ville', nom: 'Contrat de ville', desc: 'Contrat qui fédère l’État, la Métropole et les partenaires autour des quartiers prioritaires.', services: ['ejp-pv','urb-gp','hab-hab','sec-prev','com-eco','ccas-ins','fin-sub'] },
  { id: 'ctg', nom: 'Convention territoriale globale', desc: 'Convention avec la CAF qui couvre petite enfance, enfance, jeunesse, parentalité et accès aux droits.', services: ['ejp-contr','pep-par','pep-creche','ccas-acc','ecf-fam','fin-sub'] },
  { id: 'pedt', nom: 'Projet éducatif de territoire', desc: 'Cadre commun des activités périscolaires et extrascolaires de la ville.', services: ['ejp-contr','ecf-peri','ejp-alsh','spo-anim','drc-eac','drc-med'] },
  { id: 'refais-ta-serie', nom: 'Refais ta série', desc: 'Projet d’éducation à l’image : chaque année, un groupe découvre les métiers de l’audiovisuel et réalise un épisode.', services: ['drc-eac','ejp-jeun','ccas-sen','drc-mf','ejp-pv'] },
  { id: 'refonte-canal', nom: 'Refonte de l’intranet Canal', desc: 'Nouvelle version de l’intranet des agents de la ville et du CCAS, dont cet annuaire-organigramme.', services: ['dce-int','dsin-proj','dsin-app','drh-form','aud-eval'] },
  { id: 'sobriete', nom: 'Plan de sobriété énergétique', desc: 'Réduire les consommations d’énergie des bâtiments et de l’éclairage public.', services: ['arc-nrj','arc-maint','nat-ecl','fin-bud','log-ent'] },
  { id: 'stp', nom: 'Semaine de la transformation publique', desc: 'Une semaine d’entretiens et de propositions sur la transversalité entre services, avec les élèves attachés de l’IRA de Lille.', services: ['aud-eval','aud-audit','drh-form','dce-int'] },
];

// ---------- Construction ----------
const nodes = {};   // id -> { id, type, nom, sigle, parent, children[] }
const agents = [];
let ext = 4100;
const mail = (p) => slug(p.prenom) + '.' + slug(p.nom) + '@canal-maquette.fr';
function addAgent(p, poste, nodeId, missions, kw, lieu, extra = {}) {
  const a = { id: 'a' + (agents.length + 1), prenom: p.prenom, nom: p.nom, poste: fem(poste, p.g), node: nodeId,
    missions, kw, projets: [], tel: 'Poste ' + (ext += between(1, 9)), mail: mail(p), lieu, ...extra };
  agents.push(a); return a;
}
function walk(n, parent) {
  const node = { id: n.id, type: n.type, nom: n.nom, sigle: n.sigle || '', parent: parent ? parent.id : null, children: [] };
  nodes[n.id] = node; if (parent) parent.children.push(n.id);
  if (n.type === 'pole' && n.id === 'dgs') {
    const p = person(); node.head = addAgent(p, 'Directeur·rice général·e des services', n.id, ['Diriger l’ensemble des services de la ville', 'Animer le comité de direction', 'Mettre en œuvre les orientations de la municipalité'], ['direction générale', 'CODIR', 'pilotage'], HDV).id;
    addAgent(person('f'), 'Assistant·e de direction générale', n.id, ['Gérer l’agenda du DGS', 'Préparer le comité de direction'], ['CODIR', 'agenda'], HDV);
  }
  if (n.type === 'dgas') {
    const isT = n.id === 'dgst';
    const p = person(); node.head = addAgent(p, isT ? 'Directeur·rice général·e des services techniques' : 'Directeur·rice général·e adjoint·e', n.id, ['Piloter les directions du pôle', 'Arbitrer les priorités et les moyens', 'Représenter le pôle au comité de direction'], ['pilotage', 'arbitrage', 'comité de direction'], HDV).id;
    addAgent(person(), 'Assistant·e de direction', n.id, ['Gérer l’agenda et le courrier du pôle', 'Préparer les réunions de directeurs'], ['agenda', 'courrier'], HDV);
  }
  if (n.type === 'direction') {
    const isCab = n.id === 'cab', isCcas = n.id === 'ccas';
    const titre = isCab ? 'Directeur·rice de cabinet' : isCcas ? 'Directeur·rice du CCAS' : 'Directeur·rice';
    const p = person();
    node.head = addAgent(p, titre, n.id, ['Encadrer les services de la direction', 'Préparer et exécuter le budget de la direction', 'Coordonner les projets avec les autres directions'], ['management', 'budget', 'pilotage'], n.lieu).id;
    if (n.services.length > 1) addAgent(person(), 'Assistant·e de direction', n.id, ['Gérer l’agenda de la direction', 'Suivre le courrier et les parapheurs', 'Mettre à jour l’organigramme de la direction'], ['agenda', 'organigramme', 'courrier'], n.lieu);
    for (const s of n.services) {
      const sn = { id: s.id, type: 'service', nom: s.nom, sigle: '', parent: n.id, children: [] };
      nodes[s.id] = sn; node.children.push(s.id);
      const lieu = s.lieu || n.lieu || HDV;
      const chef = person();
      sn.head = addAgent(chef, 'Responsable du service ' + s.nom.charAt(0).toLowerCase() + s.nom.slice(1), s.id,
        ['Encadrer l’équipe du service', s.missions[0], 'Représenter le service auprès des autres directions'], s.kw.slice(0, 4), lieu).id;
      const size = between(2, 5) + (s.roles.length > 3 ? 1 : 0);
      for (let i = 0; i < size; i++) {
        const role = s.roles[i % s.roles.length];
        const ms = shuffle(s.missions).slice(0, between(2, 3));
        const kw = shuffle(s.kw).slice(0, between(3, 5));
        addAgent(person(), role, s.id, ms, kw, lieu);
      }
    }
  }
  if (n.children) for (const c of n.children) walk(c, node);
}
walk(TREE, null);

// Tags projets : 1 à 2 agents par service listé, référent = premier
const projets = PROJETS.map((p) => {
  const membres = [];
  for (const sid of p.services) {
    const pool = agents.filter((a) => a.node === sid);
    const n = Math.min(pool.length, sid === p.services[0] ? 3 : between(1, 2));
    for (const a of shuffle(pool).slice(0, n)) { a.projets.push(p.id); membres.push(a.id); }
  }
  return { id: p.id, nom: p.nom, desc: p.desc, referent: membres[0] };
});

const out = { genere: '2026-11-05', source: 'Structure : organigramme CST de la ville, septembre 2026 (jusqu’aux directions). Services et agents fictifs.', nodes, agents, projets, racine: 'ville' };
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '..', 'assets', 'data.js'), '// Fichier généré par scripts/generate-data.mjs — ne pas modifier à la main.\nwindow.CANAL_DATA = ' + JSON.stringify(out) + ';\n');
console.log(agents.length + ' agents, ' + Object.values(nodes).filter((n) => n.type === 'direction').length + ' directions, ' + Object.values(nodes).filter((n) => n.type === 'service').length + ' services, ' + projets.length + ' projets');
