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
  requiresPartner: boolean;
  practicePhraseFr?: string;
  practicePhraseEn?: string;
  practiceWordsFr?: readonly string[];
  practiceWordsEn?: readonly string[];
};

const COMMUNICATION_GUIDELINE = "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication";
const SFA_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/29710193/";
const SCRIPT_TRIAL = "https://pubmed.ncbi.nlm.nih.gov/24686911/";
const PARTNER_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/27117383/";
const MIT_META = "https://pmc.ncbi.nlm.nih.gov/articles/PMC8371046/";
const CART_STUDY = "https://pubs.asha.org/doi/10.1044/1092-4388(2003/083)";
const CIAT_META = "https://pubmed.ncbi.nlm.nih.gov/28846724/";
const MOBILITY_GUIDELINE = "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/4-lower-extremity-balance-mobility-and-aerobic-training";
const REPETITIVE_TASK_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/27841442/";
const SIT_TO_STAND_REVIEW = "https://pubmed.ncbi.nlm.nih.gov/24859467/";

const communicationTopics = [
  { slug: "boissons", theme: "food", fr: "boissons préférées", en: "favourite drinks", useFr: "commander ou demander une boisson", useEn: "order or ask for a drink",
    phrasesFr: ["Je voudrais un café, s’il vous plaît.", "Est-ce qu’il reste du jus d’orange au frigo?", "Je préfère mon thé très chaud, avec un peu de lait."],
    phrasesEn: ["I would like a coffee, please.", "Is there any orange juice left in the fridge?", "I prefer my tea very hot, with a little milk."],
    wordTiersFr: [["café", "eau", "thé"], ["jus", "lait", "tasse"], ["bouilloire", "cafetière", "tisane"]],
    wordTiersEn: [["coffee", "water", "tea"], ["juice", "milk", "cup"], ["kettle", "coffee maker", "herbal tea"]] },
  { slug: "repas", theme: "food", fr: "repas et collations", en: "meals and snacks", useFr: "choisir un repas familier", useEn: "choose a familiar meal",
    phrasesFr: ["J’aimerais de la soupe.", "Qu’est-ce qu’on mange ce midi?", "Ce soir, j’aimerais du poulet avec des légumes."],
    phrasesEn: ["I would like some soup.", "What are we having for lunch?", "Tonight I would like chicken with vegetables."],
    wordTiersFr: [["pain", "soupe", "riz"], ["fromage", "poulet", "salade"], ["assiette", "fourchette", "dessert"]],
    wordTiersEn: [["bread", "soup", "rice"], ["cheese", "chicken", "salad"], ["plate", "fork", "dessert"]] },
  { slug: "personnes", theme: "people", fr: "personnes importantes", en: "important people", useFr: "présenter ou retrouver une personne", useEn: "introduce or identify a person",
    phrasesFr: ["Voici Djimmy.", "Djimmy est mon proche aidant.", "Je voudrais appeler ma famille ce soir."],
    phrasesEn: ["This is Djimmy.", "Djimmy is my care partner.", "I would like to call my family tonight."],
    wordTiersFr: [["Djimmy", "famille", "ami"], ["voisin", "cousine", "collègue"], ["anniversaire", "visite", "souvenir"]],
    wordTiersEn: [["Djimmy", "family", "friend"], ["neighbour", "cousin", "colleague"], ["birthday", "visit", "memory"]] },
  { slug: "maison", theme: "home", fr: "objets de la maison", en: "objects at home", useFr: "demander un objet utile", useEn: "ask for a useful object",
    phrasesFr: ["Où sont mes lunettes?", "La télécommande est sur le divan.", "Peux-tu ouvrir la fenêtre de la cuisine?"],
    phrasesEn: ["Where are my glasses?", "The remote is on the couch.", "Can you open the kitchen window?"],
    wordTiersFr: [["lunettes", "clés", "téléphone"], ["divan", "fenêtre", "lampe"], ["télécommande", "couverture", "tiroir"]],
    wordTiersEn: [["glasses", "keys", "phone"], ["couch", "window", "lamp"], ["remote", "blanket", "drawer"]] },
  { slug: "sante", theme: "health", fr: "besoins de santé", en: "health needs", useFr: "exprimer un besoin ou une sensation", useEn: "express a need or sensation",
    phrasesFr: ["J’ai mal ici.", "J’ai besoin de mes médicaments.", "Je me sens mieux qu’hier, mais encore fatigué."],
    phrasesEn: ["It hurts here.", "I need my medication.", "I feel better than yesterday, but still tired."],
    wordTiersFr: [["douleur", "repos", "pilule"], ["médicament", "fatigue", "sommeil"], ["pharmacie", "ordonnance", "clinique"]],
    wordTiersEn: [["pain", "rest", "pill"], ["medication", "tiredness", "sleep"], ["pharmacy", "prescription", "clinic"]] },
  { slug: "deplacements", theme: "places", fr: "lieux et déplacements", en: "places and travel", useFr: "indiquer une destination", useEn: "indicate a destination",
    phrasesFr: ["Je veux aller dehors.", "Allons marcher jusqu’au parc.", "J’aimerais visiter le marché samedi matin."],
    phrasesEn: ["I want to go outside.", "Let’s walk to the park.", "I would like to visit the market on Saturday morning."],
    wordTiersFr: [["dehors", "maison", "auto"], ["parc", "marche", "trottoir"], ["marché", "autobus", "voyage"]],
    wordTiersEn: [["outside", "home", "car"], ["park", "walk", "sidewalk"], ["market", "bus", "trip"]] },
  { slug: "loisirs", theme: "leisure", fr: "loisirs et intérêts", en: "hobbies and interests", useFr: "partager une préférence", useEn: "share a preference",
    phrasesFr: ["J’aime la musique.", "Mets la partie de hockey, s’il te plaît.", "Avant, je jardinais tous les étés; j’aimerais recommencer."],
    phrasesEn: ["I like music.", "Put on the hockey game, please.", "I used to garden every summer; I would like to start again."],
    wordTiersFr: [["musique", "télé", "radio"], ["hockey", "jardin", "photos"], ["casse-tête", "tricot", "balado"]],
    wordTiersEn: [["music", "TV", "radio"], ["hockey", "garden", "photos"], ["puzzle", "knitting", "podcast"]] },
  { slug: "rendez-vous", theme: "planning", fr: "rendez-vous", en: "appointments", useFr: "préparer une rencontre", useEn: "prepare for a meeting",
    phrasesFr: ["J’ai un rendez-vous jeudi.", "Le rendez-vous est jeudi à dix heures et demie.", "Peux-tu noter le rendez-vous dans le calendrier?"],
    phrasesEn: ["I have an appointment on Thursday.", "The appointment is Thursday at ten thirty.", "Can you write the appointment in the calendar?"],
    wordTiersFr: [["jeudi", "matin", "docteur"], ["heure", "calendrier", "semaine"], ["orthophoniste", "questions", "transport"]],
    wordTiersEn: [["Thursday", "morning", "doctor"], ["time", "calendar", "week"], ["speech therapist", "questions", "ride"]] },
  { slug: "telephone", theme: "technology", fr: "téléphone et messages", en: "phone and messages", useFr: "faire passer un message bref", useEn: "communicate a short message",
    phrasesFr: ["Allô, c’est Salah.", "Peux-tu rappeler plus tard?", "Je t’envoie un message texte demain matin."],
    phrasesEn: ["Hello, this is Salah.", "Can you call back later?", "I will send you a text message tomorrow morning."],
    wordTiersFr: [["allô", "téléphone", "message"], ["rappeler", "plus tard", "numéro"], ["texto", "répondeur", "contact"]],
    wordTiersEn: [["hello", "phone", "message"], ["call back", "later", "number"], ["text", "voicemail", "contact"]] },
  { slug: "urgence", theme: "safety", fr: "informations essentielles", en: "essential information", useFr: "montrer une information déjà préparée", useEn: "show information prepared in advance",
    phrasesFr: ["J’ai besoin d’aide.", "Appelez Djimmy, s’il vous plaît.", "Mes informations importantes sont dans mon portefeuille."],
    phrasesEn: ["I need help.", "Please call Djimmy.", "My important information is in my wallet."],
    wordTiersFr: [["aide", "oui", "non"], ["urgence", "infirmière", "Djimmy"], ["adresse", "allergie", "portefeuille"]],
    wordTiersEn: [["help", "yes", "no"], ["emergency", "nurse", "Djimmy"], ["address", "allergy", "wallet"]] },
  { slug: "vetements", theme: "clothing", fr: "vêtements", en: "clothing", useFr: "demander ou choisir un vêtement", useEn: "ask for or choose clothing",
    phrasesFr: ["Je cherche mon chandail.", "Il fait froid, je vais mettre mon manteau.", "Peux-tu m’aider à attacher les boutons de ma chemise?"],
    phrasesEn: ["I am looking for my sweater.", "It is cold, I will put on my coat.", "Can you help me button my shirt?"],
    wordTiersFr: [["chandail", "souliers", "manteau"], ["pantalon", "chaussettes", "ceinture"], ["fermeture éclair", "boutons", "lacets"]],
    wordTiersEn: [["sweater", "shoes", "coat"], ["pants", "socks", "belt"], ["zipper", "buttons", "laces"]] },
  { slug: "achats", theme: "shopping", fr: "achats et magasins", en: "shopping and stores", useFr: "demander un prix ou un article", useEn: "ask about a price or an item",
    phrasesFr: ["Combien ça coûte?", "Je voudrais acheter du lait et du pain.", "Pouvez-vous ajouter ça à la liste d’épicerie?"],
    phrasesEn: ["How much is it?", "I would like to buy milk and bread.", "Can you add that to the grocery list?"],
    wordTiersFr: [["magasin", "liste", "sac"], ["épicerie", "caisse", "monnaie"], ["rabais", "facture", "livraison"]],
    wordTiersEn: [["store", "list", "bag"], ["grocery store", "checkout", "change"], ["discount", "receipt", "delivery"]] },
  { slug: "meteo", theme: "weather", fr: "météo", en: "weather", useFr: "parler du temps qu’il fait", useEn: "talk about the weather",
    phrasesFr: ["Il fait beau aujourd’hui.", "Il va pleuvoir cet après-midi.", "S’il neige demain, on restera à la maison."],
    phrasesEn: ["It is nice out today.", "It is going to rain this afternoon.", "If it snows tomorrow, we will stay home."],
    wordTiersFr: [["soleil", "pluie", "neige"], ["nuage", "vent", "orage"], ["prévisions", "température", "verglas"]],
    wordTiersEn: [["sun", "rain", "snow"], ["cloud", "wind", "storm"], ["forecast", "temperature", "freezing rain"]] },
  { slug: "routine-jour", theme: "routine", fr: "routine du jour", en: "daily routine", useFr: "raconter ou planifier sa journée", useEn: "describe or plan the day",
    phrasesFr: ["Je me lève à huit heures.", "Après le déjeuner, je fais mes exercices.", "Ce soir, je me coucherai un peu plus tôt que d’habitude."],
    phrasesEn: ["I get up at eight.", "After breakfast, I do my exercises.", "Tonight I will go to bed a little earlier than usual."],
    wordTiersFr: [["matin", "soir", "sieste"], ["déjeuner", "réveil", "pyjama"], ["habitude", "horaire", "repos"]],
    wordTiersEn: [["morning", "evening", "nap"], ["breakfast", "alarm", "pyjamas"], ["habit", "schedule", "rest"]] },
  { slug: "hygiene", theme: "hygiene", fr: "soins personnels", en: "personal care", useFr: "demander ce qu’il faut pour se préparer", useEn: "ask for what is needed to get ready",
    phrasesFr: ["Je vais me laver.", "J’ai besoin d’une serviette propre.", "Je préfère prendre ma douche le matin."],
    phrasesEn: ["I am going to wash up.", "I need a clean towel.", "I prefer to take my shower in the morning."],
    wordTiersFr: [["savon", "serviette", "brosse"], ["douche", "rasoir", "miroir"], ["dentifrice", "shampoing", "débarbouillette"]],
    wordTiersEn: [["soap", "towel", "brush"], ["shower", "razor", "mirror"], ["toothpaste", "shampoo", "washcloth"]] },
  { slug: "visites", theme: "visits", fr: "visites et invités", en: "visits and guests", useFr: "accueillir et remercier une personne", useEn: "welcome and thank a visitor",
    phrasesFr: ["Entre, je suis content de te voir.", "Veux-tu un café ou un thé?", "Merci d’être venu, reviens quand tu veux."],
    phrasesEn: ["Come in, I am happy to see you.", "Would you like coffee or tea?", "Thank you for coming, come back anytime."],
    wordTiersFr: [["bonjour", "entrez", "merci"], ["visite", "cadeau", "salon"], ["invitation", "bienvenue", "au revoir"]],
    wordTiersEn: [["hello", "come in", "thank you"], ["visit", "gift", "living room"], ["invitation", "welcome", "goodbye"]] },
  { slug: "nouvelles", theme: "news", fr: "nouvelles et sport", en: "news and sports", useFr: "commenter l’actualité ou un match", useEn: "comment on the news or a game",
    phrasesFr: ["Quoi de neuf?", "As-tu vu les nouvelles ce matin?", "On en reparlera après le bulletin de dix-huit heures."],
    phrasesEn: ["What is new?", "Did you see the news this morning?", "We will talk about it again after the six o’clock news."],
    wordTiersFr: [["journal", "sport", "match"], ["bulletin", "titres", "reportage"], ["élections", "économie", "entrevue"]],
    wordTiersEn: [["newspaper", "sports", "game"], ["newscast", "headlines", "report"], ["election", "economy", "interview"]] },
  { slug: "nature", theme: "nature", fr: "nature et saisons", en: "nature and seasons", useFr: "observer et décrire l’extérieur", useEn: "notice and describe the outdoors",
    phrasesFr: ["J’aime m’asseoir dehors.", "Les fleurs commencent à pousser.", "Cet automne, les feuilles tombent plus tôt que d’habitude."],
    phrasesEn: ["I like sitting outside.", "The flowers are starting to grow.", "This fall, the leaves are dropping earlier than usual."],
    wordTiersFr: [["arbre", "fleur", "oiseau"], ["feuilles", "gazon", "écureuil"], ["érable", "mésange", "potager"]],
    wordTiersEn: [["tree", "flower", "bird"], ["leaves", "lawn", "squirrel"], ["maple", "chickadee", "vegetable garden"]] },
  { slug: "argent", theme: "money", fr: "argent et paiements", en: "money and payments", useFr: "payer ou parler d’une facture", useEn: "pay or talk about a bill",
    phrasesFr: ["Où est mon portefeuille?", "Je paie avec ma carte.", "Il faut payer la facture d’électricité cette semaine."],
    phrasesEn: ["Where is my wallet?", "I will pay with my card.", "We need to pay the power bill this week."],
    wordTiersFr: [["argent", "carte", "dollars"], ["banque", "facture", "reçu"], ["budget", "guichet", "virement"]],
    wordTiersEn: [["money", "card", "dollars"], ["bank", "bill", "receipt"], ["budget", "ATM", "transfer"]] },
  { slug: "souvenirs", theme: "memories", fr: "souvenirs de famille", en: "family memories", useFr: "partager un souvenir qui compte", useEn: "share a memory that matters",
    phrasesFr: ["Regarde cette photo.", "C’était à notre chalet, en été.", "Raconte-moi encore notre voyage à Québec."],
    phrasesEn: ["Look at this photo.", "That was at our cottage, in the summer.", "Tell me again about our trip to Quebec City."],
    wordTiersFr: [["photo", "chalet", "été"], ["mariage", "enfance", "chanson"], ["anecdote", "jeunesse", "tradition"]],
    wordTiersEn: [["photo", "cottage", "summer"], ["wedding", "childhood", "song"], ["story", "youth", "tradition"]] },
] as const;

const communicationFamilies = [
  {
    slug: "carte-semantique",
    partner: false,
    baseDifficulty: 1,
    baseEffort: 1,
    practice: "words",
    titleFr: "Carte de mots",
    titleEn: "Word feature map",
    summaryFr: "Retrouver des mots personnels en explorant leur catégorie, leur usage et leur contexte.",
    summaryEn: "Retrieve personal words by exploring their category, use, and context.",
    instructionsFr: "1. Regardez le premier mot ci-dessous.\n2. Décrivez-le : à quoi ça sert? où est-ce? avec quoi ça va?\n3. Essayez de dire le mot. Dire, montrer ou écrire : tout compte.\n4. Continuez avec les autres mots, à votre rythme.",
    instructionsEn: "1. Look at the first word below.\n2. Describe it: what is it for? where is it? what goes with it?\n3. Try to say the word. Saying, pointing, or writing all count.\n4. Continue with the other words, at your own pace.",
    assistanceFr: "Activité en solo. Touchez un mot pour l’entendre : c’est votre indice. Prenez tout le temps qu’il faut.",
    assistanceEn: "Solo activity. Tap a word to hear it: that is your hint. Take all the time you need.",
    evidenceTitle: "Systematic review of Semantic Feature Analysis therapy studies for aphasia",
    evidenceUrl: SFA_REVIEW,
  },
  {
    slug: "melodie-rythme",
    partner: false,
    baseDifficulty: 1,
    baseEffort: 2,
    practice: "phrase",
    titleFr: "Rythme et mélodie",
    titleEn: "Rhythm and melody",
    summaryFr: "Soutenir une phrase utile avec la mélodie et le rythme, en tapant la mesure de la main.",
    summaryEn: "Support a useful phrase with melody and rhythm, tapping the beat with the hand.",
    instructionsFr: "1. Écoutez la phrase ci-dessous avec le bouton d’écoute.\n2. Chantonnez-la sur deux notes en tapant le rythme sur la table.\n3. Redites-la trois fois, de plus en plus parlée.",
    instructionsEn: "1. Listen to the phrase below with the listen button.\n2. Hum it on two notes while tapping the rhythm on the table.\n3. Say it again three times, more and more spoken.",
    assistanceFr: "Activité en solo. Le bouton d’écoute est votre modèle : réécoutez la phrase autant de fois que nécessaire.",
    assistanceEn: "Solo activity. The listen button is your model: replay the phrase as many times as you need.",
    evidenceTitle: "Melodic Intonation Therapy for post-stroke non-fluent aphasia: systematic review and meta-analysis",
    evidenceUrl: MIT_META,
  },
  {
    slug: "script-personnel",
    partner: false,
    baseDifficulty: 2,
    baseEffort: 2,
    practice: "phrase",
    titleFr: "Script personnel",
    titleEn: "Personal script",
    summaryFr: "Répéter une phrase courte qui compte dans la vie quotidienne.",
    summaryEn: "Rehearse a short phrase that matters in daily life.",
    instructionsFr: "1. Écoutez la phrase ci-dessous, puis lisez-la à voix haute.\n2. Répétez-la trois fois, à votre rythme.\n3. Imaginez la situation réelle et dites-la comme si vous y étiez.",
    instructionsEn: "1. Listen to the phrase below, then read it aloud.\n2. Repeat it three times, at your own pace.\n3. Picture the real situation and say it as if you were there.",
    assistanceFr: "Activité en solo. Écoutez la phrase, puis dites-la à votre façon. Parler, lire ou montrer : tout compte.",
    assistanceEn: "Solo activity. Listen to the phrase, then say it your way. Speaking, reading, or pointing all count.",
    evidenceTitle: "Acquisition and maintenance of scripts in aphasia: randomized crossover study",
    evidenceUrl: SCRIPT_TRIAL,
  },
  {
    slug: "ecriture-copie",
    partner: false,
    baseDifficulty: 3,
    baseEffort: 2,
    practice: "words",
    titleFr: "Écrire et retrouver",
    titleEn: "Copy and recall writing",
    summaryFr: "Copier des mots vraiment utiles, puis les écrire de mémoire pour les garder disponibles.",
    summaryEn: "Copy genuinely useful words, then write them from memory to keep them available.",
    instructionsFr: "1. Sur une feuille, copiez chaque mot ci-dessous trois fois, lentement.\n2. Cachez le modèle.\n3. Écrivez le mot de mémoire, puis vérifiez.\n4. Passez au mot suivant quand vous êtes prêt.",
    instructionsEn: "1. On paper, copy each word below three times, slowly.\n2. Cover the model.\n3. Write the word from memory, then check.\n4. Move to the next word when you are ready.",
    assistanceFr: "Activité en solo. Préparez papier et crayon avant de commencer, et vérifiez chaque mot vous-même, sans vous presser.",
    assistanceEn: "Solo activity. Prepare paper and pencil before starting, and check each word yourself, without rushing.",
    evidenceTitle: "Writing treatment for severe aphasia: who benefits? (Copy and Recall Treatment)",
    evidenceUrl: CART_STUDY,
  },
  {
    slug: "conversation-soutenue",
    partner: true,
    baseDifficulty: 2,
    baseEffort: 2,
    practice: "both",
    titleFr: "Conversation soutenue",
    titleEn: "Supported conversation",
    summaryFr: "Échanger une idée adulte et fonctionnelle avec plusieurs moyens de communication.",
    summaryEn: "Exchange an adult, functional idea using multiple ways to communicate.",
    instructionsFr: "1. Avec votre partenaire, parlez du sujet ci-dessous. La phrase peut lancer la conversation.\n2. Une idée à la fois; laissez le temps de répondre.\n3. Parole, geste, dessin ou tableau : toutes les réponses comptent.",
    instructionsEn: "1. With your partner, talk about the topic below. The phrase can start the conversation.\n2. One idea at a time; leave time to answer.\n3. Speech, gesture, drawing, or the board: every answer counts.",
    assistanceFr: "Le partenaire ralentit, laisse du temps et confirme le message compris, sans tester la personne.",
    assistanceEn: "The partner slows down, allows time, and confirms the message understood, without testing the person.",
    evidenceTitle: "Communication partner training in aphasia: systematic review",
    evidenceUrl: PARTNER_REVIEW,
  },
  {
    slug: "defi-oral",
    partner: true,
    baseDifficulty: 4,
    baseEffort: 4,
    practice: "words",
    titleFr: "Défi tout à l’oral",
    titleEn: "Spoken-first challenge",
    summaryFr: "Demander et répondre d’abord avec la parole, dans un échange court de type jeu de cartes.",
    summaryEn: "Ask and answer with speech first, in a short, card-game style exchange.",
    instructionsFr: "1. Placez des objets ou des images des mots ci-dessous entre vous et votre partenaire.\n2. Demandez chaque objet en utilisant d’abord la parole.\n3. Faites des tours courts et arrêtez-vous dès la fatigue.",
    instructionsEn: "1. Place objects or pictures of the words below between you and your partner.\n2. Ask for each object using speech first.\n3. Keep the turns short and stop as soon as you feel tired.",
    assistanceFr: "Le partenaire anime le jeu et accepte vos réparations; jamais de mise en échec.",
    assistanceEn: "The partner hosts the game and accepts your repairs; never set up failure.",
    evidenceTitle: "Constraint-induced aphasia therapy after stroke: systematic review and meta-analysis of randomized trials",
    evidenceUrl: CIAT_META,
  },
] as const;

const communicationExercises: ExerciseCatalogItem[] = communicationFamilies.flatMap((family, familyIndex) =>
  communicationTopics.map((topic, topicIndex) => {
    const difficulty = Math.min(5, family.baseDifficulty + (topicIndex % 2));
    const effortLevel = Math.min(5, family.baseEffort + ((topicIndex >> 1) % 2));
    const durationMinutes = [5, 10, 15, 20][topicIndex % 4];
    const stage = difficulty <= 2 ? "foundation" : difficulty <= 3 ? "build" : "challenge";
    const tier = difficulty <= 2 ? 0 : difficulty <= 3 ? 1 : 2;
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
      evidenceTitle: topicIndex % 2 === 0 || familyIndex === 0 ? family.evidenceTitle : "Canadian Stroke Best Practices — Language and Communication",
      evidenceUrl: topicIndex % 2 === 0 || familyIndex === 0 ? family.evidenceUrl : COMMUNICATION_GUIDELINE,
      safetyClass: "standard",
      reviewRequired: true,
      difficulty,
      effortLevel,
      durationMinutes,
      stage,
      equipmentFr: "Mot, photo ou document personnel approuvé",
      equipmentEn: "Approved personal word, photo, or document",
      requiresPartner: family.partner,
      practicePhraseFr: family.practice !== "words" ? topic.phrasesFr[tier] : undefined,
      practicePhraseEn: family.practice !== "words" ? topic.phrasesEn[tier] : undefined,
      practiceWordsFr: family.practice !== "phrase" ? topic.wordTiersFr[tier] : undefined,
      practiceWordsEn: family.practice !== "phrase" ? topic.wordTiersEn[tier] : undefined,
    };
  }),
);

const mobilityGroups = [
  {
    slug: "controle-assis", partner: false, howFr: "1. Asseyez-vous au fond de la chaise, pieds à plat au sol.\n2. Faites le mouvement lentement, 5 fois.\n3. Reposez-vous entre chaque essai.", howEn: "1. Sit well back in the chair, feet flat on the floor.\n2. Do the movement slowly, 5 times.\n3. Rest between each try.", theme: "seated-control", baseDifficulty: 1, baseEffort: 1, titleFr: "Contrôle assis", titleEn: "Seated control", evidenceTitle: "Canadian Stroke Best Practices — Balance and mobility", evidenceUrl: MOBILITY_GUIDELINE,
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
    slug: "endurance-douce", partner: false, howFr: "1. Installez-vous confortablement, le dos soutenu.\n2. Faites le mouvement doucement, en respirant normalement.\n3. Continuez 1 à 2 minutes, puis reposez-vous aussi longtemps.", howEn: "1. Get comfortable with your back supported.\n2. Do the movement gently, breathing normally.\n3. Continue for 1 to 2 minutes, then rest just as long.", theme: "endurance", baseDifficulty: 1, baseEffort: 2, titleFr: "Endurance douce", titleEn: "Gentle endurance", evidenceTitle: "Canadian Stroke Best Practices — Aerobic training after stroke", evidenceUrl: MOBILITY_GUIDELINE,
    tasks: [
      ["marche-assise", "Marche assise rythmée", "Seated marching in rhythm"],
      ["bras-rythme", "Balancer les bras en rythme", "Rhythmic arm swings"],
      ["respiration-mouvement", "Respiration et mouvement lents", "Slow breathing with movement"],
      ["intervalles-doux", "Intervalles d’activité douce", "Gentle activity intervals"],
      ["pauses-actives", "Alterner effort doux et repos", "Alternate gentle effort and rest"],
      ["recuperation-active", "Récupération active guidée", "Guided active recovery"],
    ],
  },
  {
    slug: "transferts", partner: true, howFr: "1. Placez vos pieds sous vos genoux, votre aide à côté de vous.\n2. Penchez le tronc vers l’avant, le nez au-dessus des orteils.\n3. Faites le mouvement lentement, 5 fois.", howEn: "1. Place your feet under your knees, with your helper beside you.\n2. Lean your trunk forward, nose over toes.\n3. Do the movement slowly, 5 times.", theme: "transfers", baseDifficulty: 2, baseEffort: 2, titleFr: "Transferts", titleEn: "Transfers", evidenceTitle: "Interventions for improving sit-to-stand ability following stroke", evidenceUrl: SIT_TO_STAND_REVIEW,
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
    slug: "equilibre-debout", partner: true, howFr: "1. Tenez-vous près d’un appui solide, votre aide à portée de main.\n2. Faites le mouvement lentement, 5 fois.\n3. Reprenez votre équilibre entre chaque essai.", howEn: "1. Stand near a solid support, with your helper within reach.\n2. Do the movement slowly, 5 times.\n3. Regain your balance between each try.", theme: "standing-balance", baseDifficulty: 3, baseEffort: 3, titleFr: "Équilibre debout", titleEn: "Standing balance", evidenceTitle: "Canadian Stroke Best Practices — Balance and mobility", evidenceUrl: MOBILITY_GUIDELINE,
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
    slug: "renforcement-fonctionnel", partner: true, howFr: "1. Prenez un appui solide.\n2. Faites le mouvement lentement, 8 fois.\n3. Reposez-vous, puis refaites une série si tout va bien.", howEn: "1. Hold on to a solid support.\n2. Do the movement slowly, 8 times.\n3. Rest, then do one more set if everything feels fine.", theme: "strength", baseDifficulty: 3, baseEffort: 4, titleFr: "Renforcement fonctionnel", titleEn: "Functional strength", evidenceTitle: "Repetitive task training for improving functional ability after stroke", evidenceUrl: REPETITIVE_TASK_REVIEW,
    tasks: [
      ["lever-jambe", "Lever la jambe en position assise", "Seated leg lift"],
      ["extension-genou", "Extension du genou assise", "Seated knee extension"],
      ["talons-leves", "Lever les talons avec appui", "Supported heel raises"],
      ["mini-flexions", "Mini-flexions avec appui", "Supported mini squats"],
      ["levers-partiels", "Répéter des levers partiels", "Repeated partial rises"],
      ["montee-marche", "Préparer la montée d’une marche", "Prepare a step-up"],
    ],
  },
  {
    slug: "preparation-marche", partner: true, howFr: "1. Placez-vous debout près de votre appui.\n2. Faites le pas demandé lentement, 5 fois.\n3. Reprenez votre équilibre entre chaque pas.", howEn: "1. Stand near your support.\n2. Take the practised step slowly, 5 times.\n3. Regain your balance between each step.", theme: "gait-preparation", baseDifficulty: 3, baseEffort: 3, titleFr: "Préparation à la marche", titleEn: "Gait preparation", evidenceTitle: "Repetitive task training for improving functional ability after stroke", evidenceUrl: REPETITIVE_TASK_REVIEW,
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
    slug: "marche-pratique", partner: true, howFr: "1. Préparez votre aide à la marche et votre accompagnateur.\n2. Marchez lentement, en vous arrêtant dès que nécessaire.\n3. Terminez assis, le temps de reprendre votre souffle.", howEn: "1. Get your walking aid and your helper ready.\n2. Walk slowly, stopping whenever you need to.\n3. Finish seated, taking time to catch your breath.", theme: "walking", baseDifficulty: 4, baseEffort: 4, titleFr: "Pratique de marche", titleEn: "Walking practice", evidenceTitle: "Canadian Stroke Best Practices — Balance and mobility", evidenceUrl: MOBILITY_GUIDELINE,
    tasks: [
      ["trajet-court", "Trajet court avec supervision", "Short supervised walk"],
      ["arrets-controles", "Marcher avec arrêts contrôlés", "Walk with controlled stops"],
      ["virages-larges", "Virages larges supervisés", "Supervised wide turns"],
      ["rythme-regulier", "Garder un rythme régulier", "Keep a steady rhythm"],
      ["surface-approuvee", "Changer de surface approuvée", "Approved surface change"],
      ["piece-utile", "Trajet vers une pièce utile", "Walk to a useful room"],
    ],
  },
  {
    slug: "mobilite-fonctionnelle", partner: true, howFr: "1. Choisissez le trajet avec votre accompagnateur.\n2. Avancez étape par étape, sans vous presser.\n3. Prenez une pause assise à l’arrivée.", howEn: "1. Choose the route with your helper.\n2. Move step by step, without rushing.\n3. Take a seated break when you arrive.", theme: "functional-mobility", baseDifficulty: 4, baseEffort: 4, titleFr: "Mobilité fonctionnelle", titleEn: "Functional mobility", evidenceTitle: "Canadian Stroke Best Practices — Task-specific rehabilitation", evidenceUrl: MOBILITY_GUIDELINE,
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

const mobilityExercises: ExerciseCatalogItem[] = mobilityGroups.flatMap((group) =>
  group.tasks.map((task, taskIndex) => {
    const difficulty = Math.min(5, group.baseDifficulty + (taskIndex % 2));
    const effortLevel = Math.min(5, group.baseEffort + ((taskIndex >> 1) % 2));
    const durationMinutes = [5, 10, 15, 20][taskIndex % 4];
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
      instructionsFr: `${group.howFr}\n\nArrêtez en cas de douleur, d’étourdissement, d’essoufflement inhabituel ou de perte d’équilibre. La durée affichée inclut les repos.`,
      instructionsEn: `${group.howEn}\n\nStop for pain, dizziness, unusual shortness of breath, or loss of balance. Displayed time includes rests.`,
      assistanceFr: clinicalReview ? "Validation clinique et présence de la personne désignée requises" : group.partner ? "Faites cette activité avec la personne qui vous aide, installée à côté de vous." : "Activité assise, en solo. Installez-vous sur une chaise stable avec accoudoirs avant de commencer.",
      assistanceEn: clinicalReview ? "Clinical approval and the assigned person’s presence are required" : group.partner ? "Do this activity with your helper set up right beside you." : "Seated solo activity. Set yourself up on a stable chair with armrests before starting.",
      evidenceTitle: group.evidenceTitle,
      evidenceUrl: group.evidenceUrl,
      safetyClass: clinicalReview ? "clinical_review" : group.partner ? "supervised" : "standard",
      reviewRequired: true,
      requiresPartner: group.partner,
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
