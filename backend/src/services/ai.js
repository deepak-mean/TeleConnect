const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

// Generate FAQ suggestions during onboarding
async function suggestFAQs(doctor) {
  const { city, state, specialization = 'Pediatrician', language_preference = 'hi' } = doctor;

  const prompt = `You are a medical content expert for Indian pediatricians.
The doctor is a ${specialization} based in ${city || 'India'}, ${state || ''}.
Generate the 30 most common parent questions with clear, simple answers in both Hindi and English.

Format as a JSON array (only JSON, no other text):
[
  {
    "question_hi": "...",
    "question_en": "...",
    "answer_hi": "...",
    "answer_en": "...",
    "category": "fever|feeding|vaccination|appointment|emergency|general"
  }
]

Categories to cover: fever (5), feeding/nutrition (5), vaccination (5), common infections (5), growth/development (4), emergency signs (4), general (2).
Keep answers simple, non-diagnostic, and appropriate for parents. Do not provide medical diagnoses.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON array');

  const rawFaqs = JSON.parse(jsonMatch[0]);

  // Flatten into separate Hindi/English FAQ records
  const faqs = [];
  for (const f of rawFaqs) {
    if (language_preference === 'hi' || language_preference === 'both') {
      faqs.push({
        question: f.question_hi,
        answer: f.answer_hi,
        category: f.category,
        language: 'hi',
        ai_suggested: true,
      });
    }
    if (language_preference === 'en' || language_preference === 'both') {
      faqs.push({
        question: f.question_en,
        answer: f.answer_en,
        category: f.category,
        language: 'en',
        ai_suggested: true,
      });
    }
  }

  return faqs;
}

// Detect intent from free-text patient message
async function detectIntent(message) {
  const prompt = `Patient WhatsApp message: "${message}"

Classify the intent as exactly one of:
appointment_book | appointment_cancel | appointment_reschedule | symptom_report | general_question | prescription_request | test_report | emergency | unknown

Respond with ONLY valid JSON (no other text):
{
  "intent": "...",
  "confidence": 0.0-1.0,
  "language": "hi|en|mixed",
  "extracted_info": {}
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { intent: 'unknown', confidence: 0, language: 'hi', extracted_info: {} };

  return JSON.parse(jsonMatch[0]);
}

// Match patient question to doctor's FAQs
async function matchFAQ(question, faqs) {
  if (!faqs || faqs.length === 0) return { matched_faq_id: null, confidence: 0, answer: null };

  const faqsJson = JSON.stringify(faqs.map(f => ({ id: f.id, question: f.question, answer: f.answer })));

  const prompt = `Patient asked: "${question}"

Doctor's FAQ list (JSON):
${faqsJson}

Find the best matching FAQ. If no good match (confidence < 0.6), return null for matched_faq_id.

Respond with ONLY valid JSON:
{
  "matched_faq_id": "uuid-or-null",
  "confidence": 0.0-1.0,
  "answer": "the answer text or null"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { matched_faq_id: null, confidence: 0, answer: null };

  return JSON.parse(jsonMatch[0]);
}

// Generate a safe home-care response for triage
async function generateTriageResponse(symptom, details, language = 'hi') {
  const langInstruction = language === 'hi'
    ? 'Respond in simple Hindi (Devanagari script).'
    : 'Respond in simple English.';

  const prompt = `You are a pediatric triage assistant for a clinic bot in India.
A parent reported: Symptom: ${symptom}. Details: ${JSON.stringify(details)}.

${langInstruction}
Provide ONLY:
1. 2-3 safe home care steps (not diagnosis)
2. Signs that mean they should go to hospital immediately
3. End with: "Agar aapko koi shanka ho to doctor se milein" (or English equivalent)

IMPORTANT: Do NOT diagnose. Do NOT prescribe. Keep it simple for low-literacy parents.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

module.exports = { suggestFAQs, detectIntent, matchFAQ, generateTriageResponse };
