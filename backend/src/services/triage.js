const { generateTriageResponse } = require('./ai');

// Triage flows per symptom category
const TRIAGE_FLOWS = {
  fever: {
    questions: [
      'Bachche ki umar kitni hai? (saal/mahine mein)',
      'Bukhaar kitna hai? (thermometer se maapa?)  Kitne din se hai?',
      'Aur koi takleef? (khansi, ulti, daane, peeing kam?)',
    ],
    urgentKeywords: ['5 din', 'bahut tej', 'seizure', 'behosh', '104', '105', '40', '41'],
  },
  vomiting: {
    questions: [
      'Ulti kitni baar hui? Kab se?',
      'Ulti mein khoon hai?',
      'Bachcha paani pi raha hai? Rona kam hua? Aansu nahi?',
    ],
    urgentKeywords: ['khoon', 'blood', 'behosh', 'rona nahi', 'aansu nahi', 'sunken'],
  },
  breathing: {
    questions: [], // Always urgent — no questions
    urgentKeywords: ['*'], // Always urgent
    alwaysUrgent: true,
  },
  rash: {
    questions: [
      'Daane kahan hain? Kitne din se?',
      'Khujli hoti hai?',
      'Bukhaar bhi hai saath mein?',
    ],
    urgentKeywords: ['purple', 'dark', 'khoon', 'pura sharir', 'aankhein'],
  },
  feeding: {
    questions: [
      'Bachche ki umar kitni hai?',
      'Kya bilkul nahi kha raha ya bahut kam?',
      'Weight girna? Peshab kam? Bahut rona?',
    ],
    urgentKeywords: ['bilkul nahi', 'weight', 'peshab nahi', 'bahut kamzor'],
  },
  injury: {
    questions: [
      'Kahan laga? Kya gira ya chot lagi?',
      'Khoon aa raha hai? Sujan hai?',
      'Sir mein chot? Behosh hua?',
    ],
    urgentKeywords: ['sir', 'head', 'behosh', 'khoon bahut', 'tutna', 'toot'],
  },
  swallowed: {
    questions: [
      'Kya khaya/niga? (coin, battery, tablet, toy?)',
      'Saas lene mein takleef?',
      'Kab hua?',
    ],
    urgentKeywords: ['battery', 'tablet', 'dawai', 'medicine', 'saas', 'neela', 'khansi'],
    alwaysUrgent: true, // Battery/medicine ingestion always urgent
  },
};

// Map incoming text to a symptom category
function detectSymptomCategory(text) {
  const lower = text.toLowerCase();

  const mappings = [
    { category: 'breathing', keywords: ['saas', 'breath', 'saans', 'dam', 'nasas', 'breathe', 'breathing'] },
    { category: 'swallowed', keywords: ['nigal', 'swallow', 'kha liya', 'pi liya', 'niga'] },
    { category: 'fever', keywords: ['bukhaar', 'fever', 'bukhar', 'garmi', 'temperature', 'tap'] },
    { category: 'vomiting', keywords: ['ulti', 'vomit', 'dast', 'loose motion', 'diarrhea', 'potty'] },
    { category: 'rash', keywords: ['daane', 'rash', 'laal daag', 'khujli', 'itching', 'spots'] },
    { category: 'feeding', keywords: ['kha nahi', 'nahi kha', 'feeding', 'dudh nahi', 'khana nahi', 'appetite'] },
    { category: 'injury', keywords: ['gira', 'chot', 'injury', 'fall', 'laga', 'accident', 'fracture'] },
  ];

  for (const { category, keywords } of mappings) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }

  return null;
}

// Score urgency based on collected answers
function scoreUrgency(category, answers) {
  const flow = TRIAGE_FLOWS[category];
  if (!flow) return 'low';
  if (flow.alwaysUrgent) return 'high';

  const allText = answers.join(' ').toLowerCase();
  const hasUrgentKeyword = flow.urgentKeywords.some(kw => allText.includes(kw));

  if (hasUrgentKeyword) return 'high';

  // Medium heuristics
  if (answers.length >= 2) return 'medium';
  return 'low';
}

// Get the next triage question for a given category and step
function getNextQuestion(category, step, language = 'hi') {
  const flow = TRIAGE_FLOWS[category];
  if (!flow || step >= flow.questions.length) return null;
  return flow.questions[step];
}

// Build symptom summary from collected answers
function buildSymptomSummary(category, answers) {
  const questionCount = TRIAGE_FLOWS[category]?.questions?.length || 0;
  const pairs = answers.slice(0, questionCount).map((ans, i) => {
    const q = TRIAGE_FLOWS[category]?.questions[i];
    return q ? `${ans}` : ans;
  });
  return `${category}: ${pairs.join('; ')}`;
}

module.exports = {
  TRIAGE_FLOWS,
  detectSymptomCategory,
  scoreUrgency,
  getNextQuestion,
  buildSymptomSummary,
};
