/**
 * Texte der Transaktions-E-Mails und Web-Push-Meldungen in den vier Sprachen der
 * Plattform (PRD 8.3). Deutsch ist die Referenz; die anderen Sprachen müssen exakt
 * dieselbe Struktur haben (Typprüfung über `EmailText`). Platzhalter sind Funktionen.
 */
export type EmailLocale = 'de' | 'fr' | 'it' | 'en';

/** Prisma-Locale (DE_CH …) → E-Mail-Sprache; Unbekanntes fällt auf Deutsch zurück. */
export function emailLocale(locale: string | null | undefined): EmailLocale {
  switch (locale) {
    case 'FR_CH':
      return 'fr';
    case 'IT_CH':
      return 'it';
    case 'EN':
      return 'en';
    default:
      return 'de';
  }
}

type Q = string; // zitierter Titel, z. B. «IPS 80 %»

const de = {
  lang: 'de-CH',
  footer:
    'Sie erhalten diese Nachricht von Kardia, der Stellenplattform für Gesundheitsberufe in der Schweiz.',
  manage: 'Benachrichtigungen verwalten',
  tagline: 'Stellen im Gesundheitswesen',
  status: {
    NEW: 'Neu',
    SCREENED: 'Gesichtet',
    INTERVIEW: 'Gespräch',
    OFFER: 'Angebot',
    HIRED: 'Angestellt',
    REJECTED: 'Abgesagt',
    WITHDRAWN: 'Zurückgezogen',
  } as Record<string, string>,
  magicLink: {
    subject: 'Ihr Anmeldelink für Kardia',
    preview: 'Mit einem Klick anmelden',
    title: 'Anmelden bei Kardia',
    action: 'Jetzt anmelden',
    body: 'Der Link ist 15 Minuten gültig und funktioniert einmal. Haben Sie keine Anmeldung angefordert, können Sie diese E-Mail ignorieren.',
  },
  applicationNew: {
    subject: (job: Q) => `Neue Bewerbung: ${job}`,
    preview: 'Eine neue Bewerbung ist eingegangen',
    title: 'Neue Bewerbung',
    action: 'Bewerbung ansehen',
    body: (job: Q) =>
      `Für die Stelle «${job}» ist eine Bewerbung mit Qualifikations-Pass eingegangen.`,
  },
  applicationStatus: {
    subject: (status: string) => `Status Ihrer Bewerbung: ${status}`,
    preview: (status: string) => `Neuer Status: ${status}`,
    title: 'Ihre Bewerbung hat einen neuen Status',
    action: 'Bewerbung öffnen',
    body: (job: Q) => `Stelle «${job}»:`,
  },
  applicationMessage: {
    subject: (job: Q) => `Neue Nachricht zu «${job}»`,
    preview: 'Sie haben eine neue Nachricht',
    title: 'Neue Nachricht im Bewerbungs-Thread',
    action: 'Nachricht lesen',
    body: 'Aus Datenschutzgründen steht der Inhalt nicht in der E-Mail. Sie lesen ihn nach der Anmeldung.',
  },
  offerNew: {
    subject: (org: string) => `Neues Angebot von ${org}`,
    preview: 'Ein Arbeitgeber hat Ihnen ein Angebot gesendet',
    title: 'Sie haben ein Angebot erhalten',
    action: 'Angebot ansehen',
    body: (org: string, job: Q) =>
      `${org} bietet Ihnen die Stelle «${job}» an. Das Angebot ist 14 Tage gültig. Ihr Name wird erst sichtbar, wenn Sie Interesse zeigen.`,
  },
  offerResponded: {
    subjectYes: 'Interesse an Ihrem Angebot',
    subjectNo: 'Ein Angebot wurde abgelehnt',
    previewYes: 'Die Fachperson möchte Sie kennenlernen',
    previewNo: 'Antwort auf Ihr Angebot',
    titleYes: 'Die Fachperson hat Interesse',
    titleNo: 'Angebot abgelehnt',
    actionThread: 'Zum Bewerbungs-Thread',
    actionOffers: 'Angebote ansehen',
    bodyYes: 'Name und Kontakt sind jetzt freigegeben. Der Chat steht im Bewerbungs-Thread bereit.',
    bodyNo: 'Gründe werden nur zusammengefasst angezeigt, sobald genügend Antworten vorliegen.',
  },
  shiftNew: {
    subject: (ward: string) => `Neue Schicht: ${ward}`,
    preview: 'In Ihrem Pool ist eine Schicht offen',
    title: 'Neue Schicht im Flex-Pool',
    action: 'Schichten ansehen',
    body: (ward: string, when: string) => `${ward}, Beginn ${when}.`,
  },
  shiftBooked: {
    subjectInterest: 'Interesse an einer Schicht',
    subjectBooked: 'Schicht gebucht',
    preview: 'Neuigkeit im Flex-Pool',
    titleBooked: 'Eine Schicht wurde gebucht',
    actionPool: 'Flex-Pool öffnen',
    bodyInterest: 'Eine Person aus Ihrem Pool hat Interesse angemeldet. Bitte auswählen.',
    subjectConfirmed: 'Ihre Schicht ist bestätigt',
    previewConfirmed: 'Buchung bestätigt',
    titleConfirmed: 'Schicht bestätigt',
    actionIcs: 'Kalender herunterladen',
    bodyConfirmed: (ward: string, when: string) =>
      `${ward}, ${when}. Sie erhalten 12 Stunden vorher eine Erinnerung.`,
  },
  shiftCancelled: {
    subject: 'Schicht abgesagt',
    preview: 'Eine Schicht wurde abgesagt',
    title: 'Schicht abgesagt',
    action: 'Details',
    bodyEmployer: 'Eine gebuchte Schicht ist wieder offen.',
    bodyCandidate: (when: string) => `Die Schicht vom ${when} findet für Sie nicht statt.`,
  },
  credentialReviewed: {
    subjectOk: 'Nachweis verifiziert',
    subjectNo: 'Nachweis nicht verifiziert',
    titleOk: 'Ihr Nachweis ist verifiziert',
    titleNo: 'Ihr Nachweis konnte nicht verifiziert werden',
    action: 'Qualifikations-Pass öffnen',
    bodyOk: (title: Q) => `«${title}» gilt ab sofort bei jeder Bewerbung als verifiziert.`,
    bodyNo: (title: Q) => `«${title}».`,
    reason: (reason: string) => `Grund: ${reason}`,
  },
  orgVerification: {
    subjectOk: 'Ihre Organisation ist freigegeben',
    subjectNo: 'Prüfung Ihrer Organisation',
    preview: 'Ergebnis der Prüfung',
    titleOk: 'Organisation freigegeben',
    titleNo: 'Organisation nicht freigegeben',
    action: 'Zum Cockpit',
    bodyOk: 'Sie können jetzt Stellen veröffentlichen.',
    bodyNo: 'Bitte nehmen Sie Kontakt mit dem Kardia-Team auf, um die Angaben zu klären.',
  },
  orgInvite: {
    subject: (org: string) => `Einladung zu ${org} auf Kardia`,
    preview: 'Sie wurden ins Team eingeladen',
    title: (org: string) => `Einladung zu ${org}`,
    action: 'Einladung annehmen',
    body: 'Der Link ist 7 Tage gültig.',
  },
  employeeInvite: {
    subject: (org: string) => `${org} lädt Sie zum Realitäts-Check ein`,
    preview: 'Bestätigen Sie die Angaben Ihrer Station',
    title: 'Wie arbeitet es sich auf Ihrer Station?',
    action: 'Einladung annehmen',
    body: 'Bestätigen oder korrigieren Sie die Angaben im Stationsprofil. Ihre Antworten werden nur zusammengefasst und erst ab 5 Stimmen angezeigt; niemand sieht, wer wie geantwortet hat. Die Einladung wird als «vom Arbeitgeber eingeladen» gekennzeichnet.',
  },
  poolInvite: {
    subject: (org: string) => `Einladung in den Springerpool von ${org}`,
    preview: 'Einzelschichten direkt buchen',
    title: 'Einladung in den Flex-Pool',
    action: 'Pool beitreten',
    body: (org: string) =>
      `Als Pool-Mitglied sehen Sie offene Schichten und buchen sie mit einem Tipp. Ihr Arbeitsvertrag läuft direkt über ${org}.`,
  },
  searchAlert: {
    subject: (count: number, name: string) => `${count} neue Treffer: ${name}`,
    preview: 'Neue Stellen zu Ihrer gespeicherten Suche',
    title: (name: string) => `Neue Treffer für «${name}»`,
    action: 'Alle Treffer ansehen',
    from: (amount: string) => `ab ${amount}`,
    manage: 'Suchabo ändern oder abbestellen',
  },
  inactive: {
    subject: 'Ihr Kardia-Konto wird bald gelöscht',
    preview: 'Melden Sie sich an, um Ihr Konto zu behalten',
    title: 'Ihr Konto ist seit 24 Monaten inaktiv',
    action: 'Anmelden und Konto behalten',
    body: (date: string) =>
      `Wenn Sie sich bis zum ${date} nicht anmelden, löschen wir Ihr Konto und alle Daten.`,
  },
  wardStale: {
    subject: (ward: string) => `Bitte bestätigen: ${ward}`,
    preview: 'Stationsprofil bestätigen',
    title: 'Ihr Stationsprofil braucht eine Bestätigung',
    action: 'Profil prüfen und bestätigen',
    body: (ward: string, days: string) =>
      `Das Profil «${ward}» wird in ${days} Tagen als veraltet markiert und im Ranking zurückgestuft, wenn es nicht bestätigt wird.`,
  },
  planExpiring: {
    subject: (date: string) => `Ihr Kardia-Abo endet am ${date}`,
    preview: 'Abo verlängern, damit Ihre Stellen sichtbar bleiben',
    title: 'Ihr Abo läuft bald ab',
    action: 'Abo verlängern',
    body: (plan: string, org: string, days: string) =>
      `Das Abo «${plan}» von ${org} endet in ${days} Tagen. Danach sind Ihre veröffentlichten Stellen nicht mehr in der Suche sichtbar und Abo-Funktionen wie Marktplatz und Flex-Pool sind gesperrt.`,
  },
  paymentFailed: {
    subject: 'Zahlung für Ihr Kardia-Abo fehlgeschlagen',
    preview: 'Zahlungsmittel prüfen',
    title: 'Die Zahlung ist fehlgeschlagen',
    action: 'Zahlungsmittel prüfen',
    body: (org: string) =>
      `Stripe konnte die Rechnung für ${org} nicht belasten. Bitte das Zahlungsmittel im Kundenportal aktualisieren; Stripe versucht es automatisch erneut.`,
  },
  offerWithdrawn: {
    subject: (org: string) => `Angebot zurückgezogen: ${org}`,
    preview: 'Das Angebot ist nicht mehr gültig',
    title: 'Ein Angebot wurde zurückgezogen',
    action: 'Zum Marktplatz',
    body: (org: string, job: Q) =>
      `${org} hat das Angebot «${job}» zurückgezogen. Ihr anonymes Profil bleibt unverändert sichtbar.`,
  },
  offerExpired: {
    subjectEmployer: (job: Q) => `Angebot ohne Antwort abgelaufen: ${job}`,
    previewEmployer: 'Die Fachperson hat innert 14 Tagen nicht geantwortet',
    title: 'Ein Angebot ist abgelaufen',
    actionEmployer: 'Zur Marktplatz-Suche',
    bodyEmployer: (job: Q) =>
      `Ihr Angebot für «${job}» wurde innert 14 Tagen nicht beantwortet und ist abgelaufen. Das Kontingent wird nicht zurückerstattet.`,
    subjectCandidate: (org: string) => `Angebot abgelaufen: ${org}`,
    previewCandidate: 'Das Angebot ist nicht mehr gültig',
    actionCandidate: 'Zum Marktplatz',
    bodyCandidate: (org: string, job: Q) =>
      `Das Angebot von ${org} für «${job}» war 14 Tage gültig und ist jetzt abgelaufen. Ihr anonymes Profil bleibt sichtbar.`,
  },
  credentialExpired: {
    subject: (title: Q) => `Nachweis abgelaufen: ${title}`,
    preview: 'Bitte einen aktuellen Nachweis hochladen',
    title: 'Ein Nachweis ist abgelaufen',
    action: 'Qualifikations-Pass öffnen',
    body: (title: Q, date: string) =>
      `«${title}» war gültig bis ${date}. Bei Bewerbungen erscheint er jetzt als abgelaufen. Laden Sie einen aktuellen Nachweis hoch, damit er erneut geprüft wird.`,
  },
  costAlarm: {
    subject: (usd: string) => `KI-Kostenalarm: USD ${usd} heute`,
    preview: 'Tagesgrenze der KI-Kosten erreicht',
    title: 'KI-Tageskosten über der Grenze',
    body: (usd: string, limit: string) =>
      `Heutige Kosten: USD ${usd} (Grenze USD ${limit}). Details in der Tabelle AiRun.`,
  },
  push: {
    applicationStatus: 'Bewerbung: neuer Status',
    applicationMessage: 'Neue Nachricht',
    offerNew: (org: string) => `Angebot von ${org}`,
    offerWithdrawn: (org: string) => `Angebot zurückgezogen: ${org}`,
    shiftNew: 'Neue Schicht im Pool',
    shiftBooked: 'Schicht bestätigt',
    shiftCancelled: 'Schicht abgesagt',
    shiftReminder: 'Schicht in 12 Stunden',
    credentialOk: 'Nachweis verifiziert',
    credentialNo: 'Nachweis nicht verifiziert',
    searchAlert: 'Neue Treffer',
    offerExpired: 'Angebot abgelaufen',
    credentialExpired: 'Nachweis abgelaufen',
  },
};

export type EmailText = typeof de;

const fr: EmailText = {
  lang: 'fr-CH',
  footer:
    'Vous recevez ce message de Kardia, la plateforme d’emploi des professions de la santé en Suisse.',
  manage: 'Gérer les notifications',
  tagline: 'Postes dans la santé',
  status: {
    NEW: 'Nouvelle',
    SCREENED: 'Examinée',
    INTERVIEW: 'Entretien',
    OFFER: 'Offre',
    HIRED: 'Engagé·e',
    REJECTED: 'Refusée',
    WITHDRAWN: 'Retirée',
  },
  magicLink: {
    subject: 'Votre lien de connexion à Kardia',
    preview: 'Se connecter en un clic',
    title: 'Connexion à Kardia',
    action: 'Se connecter',
    body: 'Le lien est valable 15 minutes et fonctionne une seule fois. Si vous n’avez pas demandé de connexion, ignorez cet e-mail.',
  },
  applicationNew: {
    subject: (job) => `Nouvelle candidature : ${job}`,
    preview: 'Une nouvelle candidature est arrivée',
    title: 'Nouvelle candidature',
    action: 'Voir la candidature',
    body: (job) =>
      `Une candidature avec passeport de qualifications est arrivée pour le poste «${job}».`,
  },
  applicationStatus: {
    subject: (status) => `Statut de votre candidature : ${status}`,
    preview: (status) => `Nouveau statut : ${status}`,
    title: 'Votre candidature a un nouveau statut',
    action: 'Ouvrir la candidature',
    body: (job) => `Poste «${job}» :`,
  },
  applicationMessage: {
    subject: (job) => `Nouveau message concernant «${job}»`,
    preview: 'Vous avez un nouveau message',
    title: 'Nouveau message dans le fil de candidature',
    action: 'Lire le message',
    body: 'Pour des raisons de protection des données, le contenu ne figure pas dans l’e-mail. Vous le lisez après vous être connecté·e.',
  },
  offerNew: {
    subject: (org) => `Nouvelle offre de ${org}`,
    preview: 'Un employeur vous a envoyé une offre',
    title: 'Vous avez reçu une offre',
    action: 'Voir l’offre',
    body: (org, job) =>
      `${org} vous propose le poste «${job}». L’offre est valable 14 jours. Votre nom n’est visible que si vous manifestez de l’intérêt.`,
  },
  offerResponded: {
    subjectYes: 'Intérêt pour votre offre',
    subjectNo: 'Une offre a été déclinée',
    previewYes: 'La personne souhaite vous rencontrer',
    previewNo: 'Réponse à votre offre',
    titleYes: 'La personne est intéressée',
    titleNo: 'Offre déclinée',
    actionThread: 'Vers le fil de candidature',
    actionOffers: 'Voir les offres',
    bodyYes:
      'Le nom et les coordonnées sont désormais visibles. Le chat est prêt dans le fil de candidature.',
    bodyNo:
      'Les motifs ne sont affichés de manière agrégée qu’à partir d’un nombre suffisant de réponses.',
  },
  shiftNew: {
    subject: (ward) => `Nouveau service : ${ward}`,
    preview: 'Un service est ouvert dans votre pool',
    title: 'Nouveau service dans le pool flexible',
    action: 'Voir les services',
    body: (ward, when) => `${ward}, début ${when}.`,
  },
  shiftBooked: {
    subjectInterest: 'Intérêt pour un service',
    subjectBooked: 'Service réservé',
    preview: 'Nouveauté dans le pool flexible',
    titleBooked: 'Un service a été réservé',
    actionPool: 'Ouvrir le pool flexible',
    bodyInterest: 'Une personne de votre pool a manifesté son intérêt. Veuillez choisir.',
    subjectConfirmed: 'Votre service est confirmé',
    previewConfirmed: 'Réservation confirmée',
    titleConfirmed: 'Service confirmé',
    actionIcs: 'Télécharger le calendrier',
    bodyConfirmed: (ward, when) => `${ward}, ${when}. Vous recevrez un rappel 12 heures avant.`,
  },
  shiftCancelled: {
    subject: 'Service annulé',
    preview: 'Un service a été annulé',
    title: 'Service annulé',
    action: 'Détails',
    bodyEmployer: 'Un service réservé est de nouveau ouvert.',
    bodyCandidate: (when) => `Le service du ${when} n’a pas lieu pour vous.`,
  },
  credentialReviewed: {
    subjectOk: 'Justificatif vérifié',
    subjectNo: 'Justificatif non vérifié',
    titleOk: 'Votre justificatif est vérifié',
    titleNo: 'Votre justificatif n’a pas pu être vérifié',
    action: 'Ouvrir le passeport de qualifications',
    bodyOk: (title) => `«${title}» est désormais considéré comme vérifié pour chaque candidature.`,
    bodyNo: (title) => `«${title}».`,
    reason: (reason) => `Motif : ${reason}`,
  },
  orgVerification: {
    subjectOk: 'Votre organisation est validée',
    subjectNo: 'Vérification de votre organisation',
    preview: 'Résultat de la vérification',
    titleOk: 'Organisation validée',
    titleNo: 'Organisation non validée',
    action: 'Vers le cockpit',
    bodyOk: 'Vous pouvez maintenant publier des postes.',
    bodyNo: 'Veuillez contacter l’équipe Kardia pour clarifier les informations.',
  },
  orgInvite: {
    subject: (org) => `Invitation à rejoindre ${org} sur Kardia`,
    preview: 'Vous avez été invité·e dans l’équipe',
    title: (org) => `Invitation à rejoindre ${org}`,
    action: 'Accepter l’invitation',
    body: 'Le lien est valable 7 jours.',
  },
  employeeInvite: {
    subject: (org) => `${org} vous invite au contrôle de réalité`,
    preview: 'Confirmez les informations de votre unité',
    title: 'Comment travaille-t-on dans votre unité ?',
    action: 'Accepter l’invitation',
    body: 'Confirmez ou corrigez les informations du profil de l’unité. Vos réponses ne sont affichées que de manière agrégée et à partir de 5 voix ; personne ne voit qui a répondu quoi. L’invitation est signalée comme «invitée par l’employeur».',
  },
  poolInvite: {
    subject: (org) => `Invitation dans le pool de remplacement de ${org}`,
    preview: 'Réserver des services directement',
    title: 'Invitation dans le pool flexible',
    action: 'Rejoindre le pool',
    body: (org) =>
      `En tant que membre du pool, vous voyez les services ouverts et les réservez d’un geste. Votre contrat de travail est conclu directement avec ${org}.`,
  },
  searchAlert: {
    subject: (count, name) => `${count} nouveaux résultats : ${name}`,
    preview: 'Nouveaux postes pour votre recherche enregistrée',
    title: (name) => `Nouveaux résultats pour «${name}»`,
    action: 'Voir tous les résultats',
    from: (amount) => `dès ${amount}`,
    manage: 'Modifier ou résilier l’alerte',
  },
  inactive: {
    subject: 'Votre compte Kardia sera bientôt supprimé',
    preview: 'Connectez-vous pour conserver votre compte',
    title: 'Votre compte est inactif depuis 24 mois',
    action: 'Se connecter et garder le compte',
    body: (date) =>
      `Si vous ne vous connectez pas d’ici au ${date}, nous supprimerons votre compte et toutes les données.`,
  },
  wardStale: {
    subject: (ward) => `Veuillez confirmer : ${ward}`,
    preview: 'Confirmer le profil de l’unité',
    title: 'Votre profil d’unité doit être confirmé',
    action: 'Vérifier et confirmer le profil',
    body: (ward, days) =>
      `Le profil «${ward}» sera marqué comme obsolète dans ${days} jours et déclassé dans le classement s’il n’est pas confirmé.`,
  },
  planExpiring: {
    subject: (date) => `Votre abonnement Kardia se termine le ${date}`,
    preview: 'Prolongez l’abonnement pour que vos postes restent visibles',
    title: 'Votre abonnement arrive à échéance',
    action: 'Prolonger l’abonnement',
    body: (plan, org, days) =>
      `L’abonnement «${plan}» de ${org} se termine dans ${days} jours. Ensuite, vos postes publiés ne seront plus visibles dans la recherche et les fonctions d’abonnement comme la place de marché et le pool flexible seront bloquées.`,
  },
  paymentFailed: {
    subject: 'Le paiement de votre abonnement Kardia a échoué',
    preview: 'Vérifier le moyen de paiement',
    title: 'Le paiement a échoué',
    action: 'Vérifier le moyen de paiement',
    body: (org) =>
      `Stripe n’a pas pu débiter la facture de ${org}. Veuillez mettre à jour le moyen de paiement dans le portail client ; Stripe réessaiera automatiquement.`,
  },
  offerWithdrawn: {
    subject: (org) => `Offre retirée : ${org}`,
    preview: 'L’offre n’est plus valable',
    title: 'Une offre a été retirée',
    action: 'Vers la place de marché',
    body: (org, job) =>
      `${org} a retiré l’offre «${job}». Votre profil anonyme reste visible sans changement.`,
  },
  offerExpired: {
    subjectEmployer: (job) => `Offre expirée sans réponse : ${job}`,
    previewEmployer: 'La personne n’a pas répondu dans les 14 jours',
    title: 'Une offre a expiré',
    actionEmployer: 'Vers la recherche sur la place de marché',
    bodyEmployer: (job) =>
      `Votre offre pour «${job}» est restée sans réponse pendant 14 jours et a expiré. Le contingent n’est pas remboursé.`,
    subjectCandidate: (org) => `Offre expirée : ${org}`,
    previewCandidate: 'L’offre n’est plus valable',
    actionCandidate: 'Vers la place de marché',
    bodyCandidate: (org, job) =>
      `L’offre de ${org} pour «${job}» était valable 14 jours et a maintenant expiré. Votre profil anonyme reste visible.`,
  },
  credentialExpired: {
    subject: (title) => `Justificatif expiré : ${title}`,
    preview: 'Veuillez téléverser un justificatif actuel',
    title: 'Un justificatif a expiré',
    action: 'Ouvrir le passeport de qualifications',
    body: (title, date) =>
      `«${title}» était valable jusqu’au ${date}. Lors des candidatures, il apparaît désormais comme expiré. Téléversez un justificatif actuel pour qu’il soit vérifié à nouveau.`,
  },
  costAlarm: {
    subject: (usd) => `Alerte coûts IA : USD ${usd} aujourd’hui`,
    preview: 'Plafond journalier des coûts IA atteint',
    title: 'Coûts IA du jour au-dessus du plafond',
    body: (usd, limit) =>
      `Coûts du jour : USD ${usd} (plafond USD ${limit}). Détails dans la table AiRun.`,
  },
  push: {
    applicationStatus: 'Candidature : nouveau statut',
    applicationMessage: 'Nouveau message',
    offerNew: (org) => `Offre de ${org}`,
    offerWithdrawn: (org) => `Offre retirée : ${org}`,
    shiftNew: 'Nouveau service dans le pool',
    shiftBooked: 'Service confirmé',
    shiftCancelled: 'Service annulé',
    shiftReminder: 'Service dans 12 heures',
    credentialOk: 'Justificatif vérifié',
    credentialNo: 'Justificatif non vérifié',
    searchAlert: 'Nouveaux résultats',
    offerExpired: 'Offre expirée',
    credentialExpired: 'Justificatif expiré',
  },
};

const it: EmailText = {
  lang: 'it-CH',
  footer:
    'Riceve questo messaggio da Kardia, la piattaforma di lavoro per le professioni sanitarie in Svizzera.',
  manage: 'Gestire le notifiche',
  tagline: 'Posti nella sanità',
  status: {
    NEW: 'Nuova',
    SCREENED: 'Esaminata',
    INTERVIEW: 'Colloquio',
    OFFER: 'Offerta',
    HIRED: 'Assunto/a',
    REJECTED: 'Respinta',
    WITHDRAWN: 'Ritirata',
  },
  magicLink: {
    subject: 'Il suo link di accesso a Kardia',
    preview: 'Accedere con un clic',
    title: 'Accesso a Kardia',
    action: 'Accedere ora',
    body: 'Il link è valido 15 minuti e funziona una sola volta. Se non ha richiesto l’accesso, può ignorare questa e-mail.',
  },
  applicationNew: {
    subject: (job) => `Nuova candidatura: ${job}`,
    preview: 'È arrivata una nuova candidatura',
    title: 'Nuova candidatura',
    action: 'Vedere la candidatura',
    body: (job) =>
      `Per il posto «${job}» è arrivata una candidatura con passaporto delle qualifiche.`,
  },
  applicationStatus: {
    subject: (status) => `Stato della sua candidatura: ${status}`,
    preview: (status) => `Nuovo stato: ${status}`,
    title: 'La sua candidatura ha un nuovo stato',
    action: 'Aprire la candidatura',
    body: (job) => `Posto «${job}»:`,
  },
  applicationMessage: {
    subject: (job) => `Nuovo messaggio su «${job}»`,
    preview: 'Ha un nuovo messaggio',
    title: 'Nuovo messaggio nel thread della candidatura',
    action: 'Leggere il messaggio',
    body: 'Per motivi di protezione dei dati il contenuto non è nell’e-mail. Lo legge dopo l’accesso.',
  },
  offerNew: {
    subject: (org) => `Nuova offerta da ${org}`,
    preview: 'Un datore di lavoro le ha inviato un’offerta',
    title: 'Ha ricevuto un’offerta',
    action: 'Vedere l’offerta',
    body: (org, job) =>
      `${org} le offre il posto «${job}». L’offerta è valida 14 giorni. Il suo nome diventa visibile solo se manifesta interesse.`,
  },
  offerResponded: {
    subjectYes: 'Interesse per la sua offerta',
    subjectNo: 'Un’offerta è stata rifiutata',
    previewYes: 'La persona desidera conoscerla',
    previewNo: 'Risposta alla sua offerta',
    titleYes: 'La persona è interessata',
    titleNo: 'Offerta rifiutata',
    actionThread: 'Al thread della candidatura',
    actionOffers: 'Vedere le offerte',
    bodyYes: 'Nome e contatto sono ora visibili. La chat è pronta nel thread della candidatura.',
    bodyNo: 'I motivi vengono mostrati in forma aggregata solo quando ci sono abbastanza risposte.',
  },
  shiftNew: {
    subject: (ward) => `Nuovo turno: ${ward}`,
    preview: 'Nel suo pool c’è un turno aperto',
    title: 'Nuovo turno nel pool flessibile',
    action: 'Vedere i turni',
    body: (ward, when) => `${ward}, inizio ${when}.`,
  },
  shiftBooked: {
    subjectInterest: 'Interesse per un turno',
    subjectBooked: 'Turno prenotato',
    preview: 'Novità nel pool flessibile',
    titleBooked: 'Un turno è stato prenotato',
    actionPool: 'Aprire il pool flessibile',
    bodyInterest: 'Una persona del suo pool ha manifestato interesse. Scelga per favore.',
    subjectConfirmed: 'Il suo turno è confermato',
    previewConfirmed: 'Prenotazione confermata',
    titleConfirmed: 'Turno confermato',
    actionIcs: 'Scaricare il calendario',
    bodyConfirmed: (ward, when) => `${ward}, ${when}. Riceverà un promemoria 12 ore prima.`,
  },
  shiftCancelled: {
    subject: 'Turno annullato',
    preview: 'Un turno è stato annullato',
    title: 'Turno annullato',
    action: 'Dettagli',
    bodyEmployer: 'Un turno prenotato è di nuovo aperto.',
    bodyCandidate: (when) => `Il turno del ${when} per lei non ha luogo.`,
  },
  credentialReviewed: {
    subjectOk: 'Attestato verificato',
    subjectNo: 'Attestato non verificato',
    titleOk: 'Il suo attestato è verificato',
    titleNo: 'Il suo attestato non ha potuto essere verificato',
    action: 'Aprire il passaporto delle qualifiche',
    bodyOk: (title) => `«${title}» vale da subito come verificato per ogni candidatura.`,
    bodyNo: (title) => `«${title}».`,
    reason: (reason) => `Motivo: ${reason}`,
  },
  orgVerification: {
    subjectOk: 'La sua organizzazione è stata approvata',
    subjectNo: 'Verifica della sua organizzazione',
    preview: 'Esito della verifica',
    titleOk: 'Organizzazione approvata',
    titleNo: 'Organizzazione non approvata',
    action: 'Al cockpit',
    bodyOk: 'Ora può pubblicare posti.',
    bodyNo: 'Contatti il team di Kardia per chiarire i dati.',
  },
  orgInvite: {
    subject: (org) => `Invito a ${org} su Kardia`,
    preview: 'È stato/a invitato/a nel team',
    title: (org) => `Invito a ${org}`,
    action: 'Accettare l’invito',
    body: 'Il link è valido 7 giorni.',
  },
  employeeInvite: {
    subject: (org) => `${org} la invita alla verifica della realtà`,
    preview: 'Confermi i dati del suo reparto',
    title: 'Come si lavora nel suo reparto?',
    action: 'Accettare l’invito',
    body: 'Confermi o corregga i dati del profilo del reparto. Le sue risposte vengono mostrate solo in forma aggregata e a partire da 5 voti; nessuno vede chi ha risposto cosa. L’invito è contrassegnato come «invitato dal datore di lavoro».',
  },
  poolInvite: {
    subject: (org) => `Invito nel pool di sostituti di ${org}`,
    preview: 'Prenotare turni singoli direttamente',
    title: 'Invito nel pool flessibile',
    action: 'Entrare nel pool',
    body: (org) =>
      `Come membro del pool vede i turni aperti e li prenota con un tocco. Il suo contratto di lavoro è direttamente con ${org}.`,
  },
  searchAlert: {
    subject: (count, name) => `${count} nuovi risultati: ${name}`,
    preview: 'Nuovi posti per la sua ricerca salvata',
    title: (name) => `Nuovi risultati per «${name}»`,
    action: 'Vedere tutti i risultati',
    from: (amount) => `da ${amount}`,
    manage: 'Modificare o disdire l’avviso',
  },
  inactive: {
    subject: 'Il suo conto Kardia sarà presto eliminato',
    preview: 'Acceda per mantenere il suo conto',
    title: 'Il suo conto è inattivo da 24 mesi',
    action: 'Accedere e mantenere il conto',
    body: (date) => `Se non accede entro il ${date}, eliminiamo il suo conto e tutti i dati.`,
  },
  wardStale: {
    subject: (ward) => `Da confermare: ${ward}`,
    preview: 'Confermare il profilo del reparto',
    title: 'Il profilo del suo reparto va confermato',
    action: 'Verificare e confermare il profilo',
    body: (ward, days) =>
      `Il profilo «${ward}» verrà segnato come obsoleto tra ${days} giorni e retrocesso nel ranking se non viene confermato.`,
  },
  planExpiring: {
    subject: (date) => `Il suo abbonamento Kardia termina il ${date}`,
    preview: 'Rinnovi l’abbonamento affinché i suoi posti restino visibili',
    title: 'Il suo abbonamento sta per scadere',
    action: 'Rinnovare l’abbonamento',
    body: (plan, org, days) =>
      `L’abbonamento «${plan}» di ${org} termina tra ${days} giorni. In seguito i suoi posti pubblicati non saranno più visibili nella ricerca e le funzioni in abbonamento come mercato e pool flessibile saranno bloccate.`,
  },
  paymentFailed: {
    subject: 'Pagamento del suo abbonamento Kardia non riuscito',
    preview: 'Verificare il mezzo di pagamento',
    title: 'Il pagamento non è riuscito',
    action: 'Verificare il mezzo di pagamento',
    body: (org) =>
      `Stripe non ha potuto addebitare la fattura di ${org}. Aggiorni il mezzo di pagamento nel portale clienti; Stripe riproverà automaticamente.`,
  },
  offerWithdrawn: {
    subject: (org) => `Offerta ritirata: ${org}`,
    preview: 'L’offerta non è più valida',
    title: 'Un’offerta è stata ritirata',
    action: 'Al mercato',
    body: (org, job) =>
      `${org} ha ritirato l’offerta «${job}». Il suo profilo anonimo resta visibile senza modifiche.`,
  },
  offerExpired: {
    subjectEmployer: (job) => `Offerta scaduta senza risposta: ${job}`,
    previewEmployer: 'La persona non ha risposto entro 14 giorni',
    title: 'Un’offerta è scaduta',
    actionEmployer: 'Alla ricerca nel mercato',
    bodyEmployer: (job) =>
      `La sua offerta per «${job}» non ha ricevuto risposta entro 14 giorni ed è scaduta. Il contingente non viene rimborsato.`,
    subjectCandidate: (org) => `Offerta scaduta: ${org}`,
    previewCandidate: 'L’offerta non è più valida',
    actionCandidate: 'Al mercato',
    bodyCandidate: (org, job) =>
      `L’offerta di ${org} per «${job}» era valida 14 giorni ed è ora scaduta. Il suo profilo anonimo resta visibile.`,
  },
  credentialExpired: {
    subject: (title) => `Attestato scaduto: ${title}`,
    preview: 'Carichi un attestato aggiornato',
    title: 'Un attestato è scaduto',
    action: 'Aprire il passaporto delle qualifiche',
    body: (title, date) =>
      `«${title}» era valido fino al ${date}. Nelle candidature appare ora come scaduto. Carichi un attestato aggiornato affinché venga verificato di nuovo.`,
  },
  costAlarm: {
    subject: (usd) => `Allarme costi IA: USD ${usd} oggi`,
    preview: 'Raggiunto il limite giornaliero dei costi IA',
    title: 'Costi IA giornalieri oltre il limite',
    body: (usd, limit) =>
      `Costi di oggi: USD ${usd} (limite USD ${limit}). Dettagli nella tabella AiRun.`,
  },
  push: {
    applicationStatus: 'Candidatura: nuovo stato',
    applicationMessage: 'Nuovo messaggio',
    offerNew: (org) => `Offerta da ${org}`,
    offerWithdrawn: (org) => `Offerta ritirata: ${org}`,
    shiftNew: 'Nuovo turno nel pool',
    shiftBooked: 'Turno confermato',
    shiftCancelled: 'Turno annullato',
    shiftReminder: 'Turno tra 12 ore',
    credentialOk: 'Attestato verificato',
    credentialNo: 'Attestato non verificato',
    searchAlert: 'Nuovi risultati',
    offerExpired: 'Offerta scaduta',
    credentialExpired: 'Attestato scaduto',
  },
};

const en: EmailText = {
  lang: 'en',
  footer:
    'You are receiving this message from Kardia, the jobs platform for healthcare professions in Switzerland.',
  manage: 'Manage notifications',
  tagline: 'Jobs in healthcare',
  status: {
    NEW: 'New',
    SCREENED: 'Screened',
    INTERVIEW: 'Interview',
    OFFER: 'Offer',
    HIRED: 'Hired',
    REJECTED: 'Declined',
    WITHDRAWN: 'Withdrawn',
  },
  magicLink: {
    subject: 'Your sign-in link for Kardia',
    preview: 'Sign in with one click',
    title: 'Sign in to Kardia',
    action: 'Sign in now',
    body: 'The link is valid for 15 minutes and works once. If you did not request a sign-in, you can ignore this e-mail.',
  },
  applicationNew: {
    subject: (job) => `New application: ${job}`,
    preview: 'A new application has arrived',
    title: 'New application',
    action: 'View application',
    body: (job) =>
      `An application with a qualification passport has arrived for the position «${job}».`,
  },
  applicationStatus: {
    subject: (status) => `Status of your application: ${status}`,
    preview: (status) => `New status: ${status}`,
    title: 'Your application has a new status',
    action: 'Open application',
    body: (job) => `Position «${job}»:`,
  },
  applicationMessage: {
    subject: (job) => `New message about «${job}»`,
    preview: 'You have a new message',
    title: 'New message in the application thread',
    action: 'Read message',
    body: 'For data protection reasons the content is not included in this e-mail. You can read it after signing in.',
  },
  offerNew: {
    subject: (org) => `New offer from ${org}`,
    preview: 'An employer has sent you an offer',
    title: 'You have received an offer',
    action: 'View offer',
    body: (org, job) =>
      `${org} is offering you the position «${job}». The offer is valid for 14 days. Your name only becomes visible if you express interest.`,
  },
  offerResponded: {
    subjectYes: 'Interest in your offer',
    subjectNo: 'An offer was declined',
    previewYes: 'The professional would like to meet you',
    previewNo: 'Reply to your offer',
    titleYes: 'The professional is interested',
    titleNo: 'Offer declined',
    actionThread: 'Go to application thread',
    actionOffers: 'View offers',
    bodyYes:
      'Name and contact details are now shared. The chat is ready in the application thread.',
    bodyNo: 'Reasons are only shown in aggregate once enough replies are available.',
  },
  shiftNew: {
    subject: (ward) => `New shift: ${ward}`,
    preview: 'A shift is open in your pool',
    title: 'New shift in the flex pool',
    action: 'View shifts',
    body: (ward, when) => `${ward}, starting ${when}.`,
  },
  shiftBooked: {
    subjectInterest: 'Interest in a shift',
    subjectBooked: 'Shift booked',
    preview: 'News from the flex pool',
    titleBooked: 'A shift has been booked',
    actionPool: 'Open flex pool',
    bodyInterest: 'A member of your pool has registered interest. Please choose.',
    subjectConfirmed: 'Your shift is confirmed',
    previewConfirmed: 'Booking confirmed',
    titleConfirmed: 'Shift confirmed',
    actionIcs: 'Download calendar',
    bodyConfirmed: (ward, when) => `${ward}, ${when}. You will receive a reminder 12 hours before.`,
  },
  shiftCancelled: {
    subject: 'Shift cancelled',
    preview: 'A shift has been cancelled',
    title: 'Shift cancelled',
    action: 'Details',
    bodyEmployer: 'A booked shift is open again.',
    bodyCandidate: (when) => `The shift on ${when} will not take place for you.`,
  },
  credentialReviewed: {
    subjectOk: 'Document verified',
    subjectNo: 'Document not verified',
    titleOk: 'Your document is verified',
    titleNo: 'Your document could not be verified',
    action: 'Open qualification passport',
    bodyOk: (title) => `«${title}» now counts as verified in every application.`,
    bodyNo: (title) => `«${title}».`,
    reason: (reason) => `Reason: ${reason}`,
  },
  orgVerification: {
    subjectOk: 'Your organisation has been approved',
    subjectNo: 'Review of your organisation',
    preview: 'Result of the review',
    titleOk: 'Organisation approved',
    titleNo: 'Organisation not approved',
    action: 'Go to cockpit',
    bodyOk: 'You can now publish jobs.',
    bodyNo: 'Please contact the Kardia team to clarify the details.',
  },
  orgInvite: {
    subject: (org) => `Invitation to ${org} on Kardia`,
    preview: 'You have been invited to the team',
    title: (org) => `Invitation to ${org}`,
    action: 'Accept invitation',
    body: 'The link is valid for 7 days.',
  },
  employeeInvite: {
    subject: (org) => `${org} invites you to the reality check`,
    preview: 'Confirm the details of your ward',
    title: 'What is it like to work on your ward?',
    action: 'Accept invitation',
    body: 'Confirm or correct the details in the ward profile. Your answers are only shown in aggregate and from 5 votes; nobody sees who answered what. The invitation is labelled «invited by the employer».',
  },
  poolInvite: {
    subject: (org) => `Invitation to the relief pool of ${org}`,
    preview: 'Book single shifts directly',
    title: 'Invitation to the flex pool',
    action: 'Join pool',
    body: (org) =>
      `As a pool member you see open shifts and book them with one tap. Your employment contract is directly with ${org}.`,
  },
  searchAlert: {
    subject: (count, name) => `${count} new matches: ${name}`,
    preview: 'New jobs for your saved search',
    title: (name) => `New matches for «${name}»`,
    action: 'See all matches',
    from: (amount) => `from ${amount}`,
    manage: 'Change or unsubscribe from this alert',
  },
  inactive: {
    subject: 'Your Kardia account will be deleted soon',
    preview: 'Sign in to keep your account',
    title: 'Your account has been inactive for 24 months',
    action: 'Sign in and keep account',
    body: (date) => `If you do not sign in by ${date}, we will delete your account and all data.`,
  },
  wardStale: {
    subject: (ward) => `Please confirm: ${ward}`,
    preview: 'Confirm ward profile',
    title: 'Your ward profile needs confirming',
    action: 'Review and confirm profile',
    body: (ward, days) =>
      `The profile «${ward}» will be marked as outdated in ${days} days and ranked lower if it is not confirmed.`,
  },
  planExpiring: {
    subject: (date) => `Your Kardia subscription ends on ${date}`,
    preview: 'Renew your subscription so your jobs stay visible',
    title: 'Your subscription is ending soon',
    action: 'Renew subscription',
    body: (plan, org, days) =>
      `The «${plan}» subscription of ${org} ends in ${days} days. After that, your published jobs are no longer visible in search and subscription features such as the marketplace and flex pool are locked.`,
  },
  paymentFailed: {
    subject: 'Payment for your Kardia subscription failed',
    preview: 'Check payment method',
    title: 'The payment failed',
    action: 'Check payment method',
    body: (org) =>
      `Stripe could not charge the invoice for ${org}. Please update the payment method in the customer portal; Stripe will retry automatically.`,
  },
  offerWithdrawn: {
    subject: (org) => `Offer withdrawn: ${org}`,
    preview: 'The offer is no longer valid',
    title: 'An offer has been withdrawn',
    action: 'Go to marketplace',
    body: (org, job) =>
      `${org} has withdrawn the offer «${job}». Your anonymous profile remains visible unchanged.`,
  },
  offerExpired: {
    subjectEmployer: (job) => `Offer expired without reply: ${job}`,
    previewEmployer: 'The professional did not reply within 14 days',
    title: 'An offer has expired',
    actionEmployer: 'Go to marketplace search',
    bodyEmployer: (job) =>
      `Your offer for «${job}» received no reply within 14 days and has expired. The quota is not refunded.`,
    subjectCandidate: (org) => `Offer expired: ${org}`,
    previewCandidate: 'The offer is no longer valid',
    actionCandidate: 'Go to marketplace',
    bodyCandidate: (org, job) =>
      `The offer from ${org} for «${job}» was valid for 14 days and has now expired. Your anonymous profile remains visible.`,
  },
  credentialExpired: {
    subject: (title) => `Document expired: ${title}`,
    preview: 'Please upload a current document',
    title: 'A document has expired',
    action: 'Open qualification passport',
    body: (title, date) =>
      `«${title}» was valid until ${date}. It now appears as expired in applications. Upload a current document so it can be reviewed again.`,
  },
  costAlarm: {
    subject: (usd) => `AI cost alarm: USD ${usd} today`,
    preview: 'Daily AI cost limit reached',
    title: 'Daily AI costs above the limit',
    body: (usd, limit) =>
      `Today's costs: USD ${usd} (limit USD ${limit}). Details in the AiRun table.`,
  },
  push: {
    applicationStatus: 'Application: new status',
    applicationMessage: 'New message',
    offerNew: (org) => `Offer from ${org}`,
    offerWithdrawn: (org) => `Offer withdrawn: ${org}`,
    shiftNew: 'New shift in the pool',
    shiftBooked: 'Shift confirmed',
    shiftCancelled: 'Shift cancelled',
    shiftReminder: 'Shift in 12 hours',
    credentialOk: 'Document verified',
    credentialNo: 'Document not verified',
    searchAlert: 'New matches',
    offerExpired: 'Offer expired',
    credentialExpired: 'Document expired',
  },
};

export const EMAIL_TEXT: Record<EmailLocale, EmailText> = { de, fr, it, en };
