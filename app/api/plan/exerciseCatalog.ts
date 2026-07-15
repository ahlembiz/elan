export type ExerciseCatalogItem = {
  id: string;
  domain: "communication" | "mobility";
  theme: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  instructionsFr: string;
  instructionsEn: string;
  assistanceFr: string;
  assistanceEn: string;
  evidenceTitle: string;
  evidenceUrl: string;
  safetyClass: "standard" | "supervised" | "clinical_review";
  reviewRequired: boolean;
  difficulty: number;
  effortLevel: number;
  durationMinutes: number;
  stage: "foundation" | "build" | "challenge";
  equipmentFr: string;
  equipmentEn: string;
};

const COMMUNICATION_GUIDELINE = "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication";
const SFA_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/29710193/";
const SCRIPT_TRIAL = "https://pubmed.ncbi.nlm.nih.gov/24686911/";
const PARTNER_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/27117383/";
const MOBILITY_GUIDELINE = "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/4-lower-extremity-balance-mobility-and-aerobic-training";
const REPETITIVE_TASK_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/27841442/";
const SIT_TO_STAND_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/24859467/";

const communicationTopics = [
  { slug: "boissons", theme: "food", fr: "boissons préférées", en: "favourite drinks", useFr: "commander ou demander une boisson", useEn: "order or ask for a drink" },
  { slug: "repas", theme: "food", fr: "repas et collations", en: "meals and snacks", useFr: "choisir un repas familier", useEn: "choose a familiar meal" },
  { slug: "personnes", theme: "people", fr: "personnes importantes", en: "important people", useFr: "présenter ou retrouver une personne", useEn: "introduce or identify a person" },
  { slug: "maison", theme: "home", fr: "objets de la maison", en: "objects at home", useFr: "demander un objet utile", useEn: "ask for a useful object" },
  { slug: "sante", theme: "health", fr: "besoins de santé", en: "health needs", useFr: "exprimer un besoin ou une sensation", useEn: "express a need or sensation" },
  { slug: "deplacements", theme: "places", fr: "lieux et déplacements", en: "places and travel", useFr: "indiquer une destination", useEn: "indicate a destination" },
  { slug: "loisirs", theme: "leisure", fr: "loisirs et intérêts", en: "hobbies and interests", useFr: "partager une préférence", useEn: "share a preference" },
  { slug: "rendez-vous", theme: "planning", fr: "rendez-vous", en: "appointments", useFr: "préparer une rencontre", useEn: "prepare for a meeting" },
  { slug: "telephone", theme: "technology", fr: "téléphone et messages", en: "phone and messages", useFr: "faire passer un message bref", useEn: "communicate a short message" },
  { slug: "urgence", theme: "safety", fr: "informations essentielles", en: "essential information", useFr: "montrer une information déjà préparée", useEn: "show information prepared in advance" },
] as const;

const communicationFamilies = [
  {
    slug: "carte-semantique",
    titleFr: "Carte de mots",
    titleEn: "Word feature map",
    summaryFr: "Retrouver des mots personnels en explorant leur catégorie, leur usage et leur contexte.",
    summaryEn: "Retrieve personal words by exploring their category, use, and context.",
    instructionsFr: "Choisissez un mot réellement utile. Décrivez sa catégorie, son usage, son apparence et son contexte, puis utilisez seulement le niveau d’indice prévu au plan.",
    instructionsEn: "Choose a genuinely useful word. Describe its category, use, appearance, and context, then use only the cue level set in the plan.",
    assistanceFr: "Indices gradués configurés par l’orthophoniste; un proche peut laisser le temps de répondre.",
    assistanceEn: "Graded cues configured by the speech-language pathologist; a partner can allow extra response time.",
    evidenceTitle: "Systematic review of Semantic Feature Analysis therapy studies for aphasia",
    evidenceUrl: SFA_REVIEW,
  },
  {
    slug: "script-personnel",
    titleFr: "Script personnel",
    titleEn: "Personal script",
    summaryFr: "Répéter une courte interaction qui compte dans la vie quotidienne.",
    summaryEn: "Rehearse a short interaction that matters in daily life.",
    instructionsFr: "Pratiquez le script personnalisé validé avec l’orthophoniste. Parlez, lisez, écrivez ou pointez; réduisez les indices seulement selon le plan.",
    instructionsEn: "Practise the personalized script approved with the speech-language pathologist. Speak, read, write, or point; reduce cues only as planned.",
    assistanceFr: "Modèle audio, écrit ou imagé selon le plan; le proche confirme le sens sans corriger la personne.",
    assistanceEn: "Audio, written, or picture model as planned; the partner confirms meaning without correcting the person.",
    evidenceTitle: "Acquisition and maintenance of scripts in aphasia: randomized crossover study",
    evidenceUrl: SCRIPT_TRIAL,
  },
  {
    slug: "conversation-soutenue",
    titleFr: "Conversation soutenue",
    titleEn: "Supported conversation",
    summaryFr: "Échanger une idée adulte et fonctionnelle avec plusieurs moyens de communication.",
    summaryEn: "Exchange an adult, functional idea using multiple ways to communicate.",
    instructionsFr: "Présentez une idée à la fois, offrez des choix adultes et utilisez parole, écriture, geste, dessin ou tableau. Confirmez le message compris.",
    instructionsEn: "Present one idea at a time, offer adult choices, and use speech, writing, gesture, drawing, or the board. Confirm the message understood.",
    assistanceFr: "Partenaire guidé: ralentir, donner du temps et réparer le message sans tester la personne.",
    assistanceEn: "Guided partner: slow down, allow time, and repair the message without testing the person.",
    evidenceTitle: "Communication partner training in aphasia: systematic review",
    evidenceUrl: PARTNER_REVIEW,
  },
] as const;

const communicationExercises: ExerciseCatalogItem[] = communicationFamilies.flatMap((family, familyIndex) =>
  communicationTopics.map((topic, topicIndex) => {
    const difficulty = Math.min(5, 1 + familyIndex + (topicIndex % 3));
    const effortLevel = Math.min(5, 1 + ((topicIndex + familyIndex) % 5));
    const durationMinutes = [5, 10, 15][(topicIndex + familyIndex) % 3];
    const stage = difficulty <= 2 ? "foundation" : difficulty <= 3 ? "build" : "challenge";
    return {
      id: `communication-${family.slug}-${topic.slug}`,
      domain: "communication",
      theme: topic.theme,
      titleFr: `${family.titleFr} · ${topic.fr}`,
      titleEn: `${family.titleEn} · ${topic.en}`,
      summaryFr: `${family.summaryFr} Objectif fonctionnel: ${topic.useFr}.`,
      summaryEn: `${family.summaryEn} Functional goal: ${topic.useEn}.`,
      instructionsFr: family.instructionsFr,
      instructionsEn: family.instructionsEn,
      assistanceFr: family.assistanceFr,
      assistanceEn: family.assistanceEn,
      evidenceTitle: familyIndex === 0 ? family.evidenceTitle : topicIndex % 2 === 0 ? family.evidenceTitle : "Canadian Stroke Best Practices — Language and Communication",
      evidenceUrl: familyIndex === 0 ? family.evidenceUrl : topicIndex % 2 === 0 ? family.evidenceUrl : COMMUNICATION_GUIDELINE,
      safetyClass: "standard",
      reviewRequired: true,
      difficulty,
      effortLevel,
      durationMinutes,
      stage,
      equipmentFr: "Mot, photo ou document personnel approuvé",
      equipmentEn: "Approved personal word, photo, or document",
    };
  }),
);

const mobilityGroups = [
  {
    slug: "controle-assis", theme: "seated-control", titleFr: "Contrôle assis", titleEn: "Seated control", evidenceTitle: "Canadian Stroke Best Practices — Balance and mobility", evidenceUrl: MOBILITY_GUIDELINE,
    tasks: [
      ["alignement", "Trouver l’alignement assis", "Find seated alignment"],
      ["transfert-poids", "Transfert de poids latéral", "Lateral weight shift"],
      ["atteinte-avant", "Atteinte fonctionnelle vers l’avant", "Forward functional reach"],
      ["atteinte-cote", "Atteinte fonctionnelle de côté", "Side functional reach"],
      ["rotation-tronc", "Rotation du tronc guidée", "Guided trunk rotation"],
      ["objet-table", "Déplacer un objet sur la table", "Move an object on the table"],
    ],
  },
  {
    slug: "transferts", theme: "transfers", titleFr: "Transferts", titleEn: "Transfers", evidenceTitle: "Interventions for improving sit-to-stand ability following stroke", evidenceUrl: SIT_TO_STAND_REVIEW,
    tasks: [
      ["placement-pieds", "Préparer le placement des pieds", "Prepare foot placement"],
      ["inclinaison", "Inclinaison du tronc préparatoire", "Preparatory trunk lean"],
      ["demi-lever", "Demi-lever guidé", "Guided partial rise"],
      ["assis-debout", "Se lever d’une chaise", "Rise from a chair"],
      ["debout-assis", "Retour contrôlé vers la chaise", "Controlled return to sitting"],
      ["transfert-complet", "Séquence de transfert complète", "Complete transfer sequence"],
    ],
  },
  {
    slug: "equilibre-debout", theme: "standing-balance", titleFr: "Équilibre debout", titleEn: "Standing balance", evidenceTitle: "Canadian Stroke Best Practices — Balance and mobility", evidenceUrl: MOBILITY_GUIDELINE,
    tasks: [
      ["installation", "Installation debout avec appui", "Supported standing setup"],
      ["maintien", "Maintien debout protégé", "Protected standing hold"],
      ["transfert-poids", "Transfert de poids debout", "Standing weight shift"],
      ["atteinte", "Atteinte debout avec appui", "Supported standing reach"],
      ["regard", "Changer la direction du regard", "Change gaze direction"],
      ["double-tache", "Choix simple en position debout", "Simple choice while standing"],
    ],
  },
  {
    slug: "preparation-marche", theme: "gait-preparation", titleFr: "Préparation à la marche", titleEn: "Gait preparation", evidenceTitle: "Repetitive task training for improving functional ability after stroke", evidenceUrl: REPETITIVE_TASK_REVIEW,
    tasks: [
      ["talon", "Préparer le contact du talon", "Prepare heel contact"],
      ["pas-avant", "Initier un pas vers l’avant", "Initiate a forward step"],
      ["pas-cote", "Initier un pas de côté", "Initiate a side step"],
      ["retour", "Ramener le pied au repère", "Return foot to marker"],
      ["alternance", "Alterner les appuis guidés", "Alternate guided support"],
      ["demarrage", "Préparer le démarrage de marche", "Prepare gait initiation"],
    ],
  },
  {
    slug: "mobilite-fonctionnelle", theme: "functional-mobility", titleFr: "Mobilité fonctionnelle", titleEn: "Functional mobility", evidenceTitle: "Canadian Stroke Best Practices — Task-specific rehabilitation", evidenceUrl: MOBILITY_GUIDELINE,
    tasks: [
      ["destination", "Choisir une destination proche", "Choose a nearby destination"],
      ["demarrage-arret", "Démarrer et s’arrêter au repère", "Start and stop at a marker"],
      ["demi-tour", "Préparer un demi-tour", "Prepare a half turn"],
      ["objet", "Transporter un objet léger approuvé", "Carry an approved light object"],
      ["porte", "Préparer le passage d’une porte", "Prepare to pass through a doorway"],
      ["trajet", "Enchaîner un court trajet approuvé", "Complete an approved short route"],
    ],
  },
] as const;

const mobilityExercises: ExerciseCatalogItem[] = mobilityGroups.flatMap((group, groupIndex) =>
  group.tasks.map((task, taskIndex) => {
    const difficulty = Math.min(5, 1 + groupIndex + Math.floor(taskIndex / 2));
    const effortLevel = Math.min(5, 1 + ((groupIndex + taskIndex) % 5));
    const durationMinutes = [5, 10, 15, 20][(groupIndex + taskIndex) % 4];
    const stage = difficulty <= 2 ? "foundation" : difficulty <= 3 ? "build" : "challenge";
    const clinicalReview = difficulty >= 4;
    return {
      id: `mobility-${group.slug}-${task[0]}`,
      domain: "mobility",
      theme: group.theme,
      titleFr: `${group.titleFr} · ${task[1]}`,
      titleEn: `${group.titleEn} · ${task[2]}`,
      summaryFr: "Pratiquer une tâche fonctionnelle dans les limites, avec l’installation et l’aide déjà choisies par la physiothérapeute.",
      summaryEn: "Practise a functional task within the limits, setup, and assistance already chosen by the physiotherapist.",
      instructionsFr: "Suivez uniquement l’appui, le côté, l’amplitude, les répétitions et les pauses inscrits au plan. La durée affichée inclut les repos. Arrêtez en cas de douleur, étourdissement, essoufflement inhabituel ou perte d’équilibre.",
      instructionsEn: "Follow only the support, side, range, repetitions, and rest written in the plan. Displayed time includes rests. Stop for pain, dizziness, unusual shortness of breath, or loss of balance.",
      assistanceFr: clinicalReview ? "Validation clinique et présence de la personne désignée requises" : "Supervision et installation exactement selon le plan de mobilité",
      assistanceEn: clinicalReview ? "Clinical approval and the assigned person’s presence are required" : "Supervision and setup exactly as written in the mobility plan",
      evidenceTitle: group.evidenceTitle,
      evidenceUrl: group.evidenceUrl,
      safetyClass: clinicalReview ? "clinical_review" : "supervised",
      reviewRequired: true,
      difficulty,
      effortLevel,
      durationMinutes,
      stage,
      equipmentFr: "Chaise, appui ou aide technique indiqués au plan — aucun remplacement",
      equipmentEn: "Chair, support, or mobility aid named in the plan—no substitutions",
    };
  }),
);

export const exerciseCatalog: ExerciseCatalogItem[] = [...communicationExercises, ...mobilityExercises];

