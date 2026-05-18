const supabase = require('../lib/supabase');
const { sendMessage, sendDoctorAlert, buildAfterHoursMessage } = require('./whatsapp');
const { detectIntent, matchFAQ } = require('./ai');
const { detectSymptomCategory, scoreUrgency, getNextQuestion, buildSymptomSummary } = require('./triage');

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// States
const STATE = {
  IDLE: 'idle',
  GREETING: 'greeting',
  MAIN_MENU: 'main_menu',
  TRIAGE: 'triage',
  FAQ: 'faq',
  APPOINTMENT: 'appointment',
  RESOLVED: 'resolved',
};

// ─── Main entry point ────────────────────────────────────────────────────────

async function handleIncomingMessage({ phoneNumber, body, messageType }) {
  // Find which doctor this patient belongs to
  const { data: patient } = await supabase
    .from('patients')
    .select('*, doctors(*)')
    .eq('whatsapp_number', phoneNumber)
    .single();

  // If no patient found, we can't route — send generic response
  if (!patient) {
    await sendMessage(phoneNumber, `Namaskar! 🙏\nYeh bot abhi setup ho raha hai. Seedha clinic se contact karein.\n\n⚠️ Yeh bot medical advice nahi deta.`);
    return;
  }

  const doctor = patient.doctors;

  // Get or create conversation
  let conversation = await getOrCreateConversation(patient, doctor, phoneNumber);

  // Check inactivity — reset if stale
  const lastMsg = new Date(conversation.last_message_at);
  if (Date.now() - lastMsg.getTime() > INACTIVITY_TIMEOUT_MS) {
    conversation = await resetConversation(conversation.id, patient, doctor);
  }

  // Check if outside working hours
  if (!isWithinWorkingHours(doctor.working_hours)) {
    await handleAfterHours(phoneNumber, body, doctor, patient, conversation);
    return;
  }

  // Log inbound message
  await logMessage(conversation.id, 'inbound', body, messageType);

  // Route based on current state
  const response = await route(conversation, body, patient, doctor);

  if (response) {
    await sendMessage(phoneNumber, response.text);
    await logMessage(conversation.id, 'outbound', response.text);
    await updateConversationState(conversation.id, response.newState, response.newContext);
  }
}

// ─── State router ─────────────────────────────────────────────────────────────

async function route(conversation, body, patient, doctor) {
  const state = conversation.state;
  const ctx = conversation.context || {};
  const trimmed = body.trim();

  switch (state) {
    case STATE.IDLE:
    case STATE.GREETING:
      return handleGreeting(patient, doctor, conversation);

    case STATE.MAIN_MENU:
      return handleMainMenu(trimmed, patient, doctor, conversation);

    case STATE.TRIAGE:
      return handleTriage(trimmed, ctx, patient, doctor, conversation);

    case STATE.FAQ:
      return handleFAQ(trimmed, ctx, patient, doctor, conversation);

    case STATE.APPOINTMENT:
      return handleAppointment(trimmed, ctx, patient, doctor, conversation);

    default:
      return handleGreeting(patient, doctor, conversation);
  }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

async function handleGreeting(patient, doctor, conversation) {
  const clinicName = doctor.clinic_name || `Dr. ${doctor.name}`;
  const disclaimer = '\n\n⚠️ Yeh bot medical advice nahi deta. Emergency mein 108 call karein.';

  const text = `Namaskar ${patient.name}! 🙏\nMain ${clinicName} ka WhatsApp sahayak hun.${disclaimer}

Aap kaise help kar sakta hun?

1️⃣ Appointment lena/badalna
2️⃣ Bacho ki sehat ke baare mein sawaal
3️⃣ Zaruri madad chahiye
4️⃣ Prescription ya report

Kripya number type karein (1, 2, 3 ya 4)`;

  return { text, newState: STATE.MAIN_MENU, newContext: {} };
}

// ─── Main menu ────────────────────────────────────────────────────────────────

async function handleMainMenu(input, patient, doctor, conversation) {
  // Try numbered choice first
  if (input === '1') return startAppointmentFlow(patient, doctor);
  if (input === '2') return startFAQFlow(patient, doctor);
  if (input === '3') return startTriageFlow(patient, doctor, input);
  if (input === '4') return handlePrescriptionRequest(patient, doctor);

  // Fall back to intent detection for free text
  const intentResult = await detectIntent(input);

  switch (intentResult.intent) {
    case 'appointment_book':
    case 'appointment_reschedule':
    case 'appointment_cancel':
      return startAppointmentFlow(patient, doctor);
    case 'symptom_report':
    case 'emergency':
      return startTriageFlow(patient, doctor, input);
    case 'general_question':
      return startFAQFlow(patient, doctor, input);
    case 'prescription_request':
      return handlePrescriptionRequest(patient, doctor);
    default:
      return {
        text: `Maafi chahta hun, samajh nahi aaya. 😊\nKripya number choose karein:\n\n1️⃣ Appointment\n2️⃣ Sehat ka sawaal\n3️⃣ Zaruri madad\n4️⃣ Prescription/Report`,
        newState: STATE.MAIN_MENU,
        newContext: {},
      };
  }
}

// ─── Triage flow ──────────────────────────────────────────────────────────────

async function startTriageFlow(patient, doctor, initialMessage) {
  const category = detectSymptomCategory(initialMessage || '');

  if (!category) {
    return {
      text: `Kya takleef hai bachche ko? Batayein:\n\n1️⃣ Bukhaar (Fever)\n2️⃣ Ulti/Dast\n3️⃣ Saas lene mein takleef\n4️⃣ Daane/Rash\n5️⃣ Kuch nahi kha raha\n6️⃣ Chot lagi\n7️⃣ Kuch nigal gaya`,
      newState: STATE.TRIAGE,
      newContext: { step: 'select_symptom' },
    };
  }

  return askTriageQuestion(category, 0, doctor);
}

async function handleTriage(input, ctx, patient, doctor, conversation) {
  // Symptom selection step
  if (ctx.step === 'select_symptom') {
    const categoryMap = {
      '1': 'fever', '2': 'vomiting', '3': 'breathing',
      '4': 'rash', '5': 'feeding', '6': 'injury', '7': 'swallowed',
    };
    const category = categoryMap[input] || detectSymptomCategory(input);

    if (!category) {
      return {
        text: 'Kripya 1-7 mein se number choose karein.',
        newState: STATE.TRIAGE,
        newContext: ctx,
      };
    }

    // Breathing is always urgent
    if (category === 'breathing') {
      await createUrgentAlert(patient, doctor, conversation, 'Breathing difficulty', 'Saas lene mein takleef — URGENT');
      return {
        text: `🚨 Saas lene mein takleef ZARURI hai!\n\nAbhi:\n• Bachche ko seedha bithayein\n• Kapde dhile karein\n• 108 call karein ya seedhe hospital jayein\n\nDr. ${doctor.name} ko alert bhej diya gaya hai.`,
        newState: STATE.RESOLVED,
        newContext: { resolved: true, urgent: true },
      };
    }

    return askTriageQuestion(category, 0, doctor);
  }

  // Collecting answers
  const category = ctx.category;
  const answers = ctx.answers || [];
  const currentStep = ctx.question_step || 0;

  answers.push(input);

  const nextQuestion = getNextQuestion(category, currentStep + 1);

  if (nextQuestion && answers.length < 3) {
    return {
      text: nextQuestion,
      newState: STATE.TRIAGE,
      newContext: { ...ctx, answers, question_step: currentStep + 1 },
    };
  }

  // All questions answered — score urgency
  const urgency = scoreUrgency(category, answers);
  const summary = buildSymptomSummary(category, answers);

  if (urgency === 'high') {
    await createUrgentAlert(patient, doctor, conversation, category, summary);
    return {
      text: `🚨 Yeh ZARURI lag raha hai.\n\nDr. ${doctor.name} ko abhi alert bhej diya gaya hai.\n\nIs beech:\n• Bachche ko aaram karwayein\n• 108 par call karein agar haalat bigde\n\nKya aur madad chahiye? (1: Haan, 0: Nahi)`,
      newState: STATE.RESOLVED,
      newContext: { resolved: true, urgent: true, category, summary },
    };
  }

  // Generate home-care advice
  const { generateTriageResponse } = require('./ai');
  const advice = await generateTriageResponse(category, { answers }, patient.language || 'hi');

  return {
    text: `${advice}\n\n---\nKya aur koi sawaal hai? (1: Haan, 0: Wapas menu)`,
    newState: STATE.RESOLVED,
    newContext: { resolved: true, category },
  };
}

function askTriageQuestion(category, step, doctor) {
  const question = getNextQuestion(category, step);
  if (!question) return null;

  return {
    text: question,
    newState: STATE.TRIAGE,
    newContext: { category, question_step: step, answers: [] },
  };
}

// ─── FAQ flow ─────────────────────────────────────────────────────────────────

async function startFAQFlow(patient, doctor, initialQuestion) {
  if (initialQuestion) {
    return searchAndAnswerFAQ(initialQuestion, patient, doctor);
  }

  return {
    text: `Apna sawaal type karein aur main jawab dhundhunga. 😊\n\nJaise: "Bukhaar mein kya karein?" ya "Vaccine kab lagwani chahiye?"`,
    newState: STATE.FAQ,
    newContext: {},
  };
}

async function handleFAQ(input, ctx, patient, doctor, conversation) {
  if (input === '0') return handleGreeting(patient, doctor, conversation);
  return searchAndAnswerFAQ(input, patient, doctor);
}

async function searchAndAnswerFAQ(question, patient, doctor) {
  const { data: faqs } = await supabase
    .from('faqs')
    .select('id, question, answer')
    .eq('doctor_id', doctor.id)
    .eq('is_active', true)
    .eq('language', patient.language || 'hi');

  const result = await matchFAQ(question, faqs || []);

  if (result.matched_faq_id && result.confidence > 0.6) {
    return {
      text: `${result.answer}\n\n---\nKya aur koi sawaal hai? (Type karein ya 0 se wapas jayein)`,
      newState: STATE.FAQ,
      newContext: {},
    };
  }

  return {
    text: `Maafi, is sawaal ka jawab abhi mere paas nahi hai.\n\nDr. ${doctor.name} se seedhe poochhne ke liye:\n1️⃣ Appointment book karein\n0️⃣ Wapas main menu`,
    newState: STATE.FAQ,
    newContext: {},
  };
}

// ─── Appointment flow ─────────────────────────────────────────────────────────

async function startAppointmentFlow(patient, doctor) {
  return {
    text: `Appointment ke liye:\n\n1️⃣ Nayi appointment book karein\n2️⃣ Appointment cancel karein\n3️⃣ Appointment ka time puchein\n0️⃣ Wapas main menu`,
    newState: STATE.APPOINTMENT,
    newContext: { sub_state: 'menu' },
  };
}

async function handleAppointment(input, ctx, patient, doctor, conversation) {
  if (input === '0') return handleGreeting(patient, doctor, conversation);

  if (input === '1') {
    return {
      text: `Appointment book karne ke liye:\nOPD time: ${doctor.working_hours?.start || '09:00'} - ${doctor.working_hours?.end || '18:00'}\n\nKripya seedhe clinic call karein ya appointment ke liye:\n📞 ${doctor.whatsapp_number || doctor.phone}\n\nHum jaldi appointment system launch kar rahe hain! 🙏`,
      newState: STATE.MAIN_MENU,
      newContext: {},
    };
  }

  return startAppointmentFlow(patient, doctor);
}

// ─── Prescription request ─────────────────────────────────────────────────────

async function handlePrescriptionRequest(patient, doctor) {
  return {
    text: `Prescription ya report ke liye seedhe clinic se contact karein.\n\n📞 ${doctor.whatsapp_number || doctor.phone}\n🏥 ${doctor.clinic_name}\n\nBot ke through prescription dena safe nahi hota. 🙏`,
    newState: STATE.MAIN_MENU,
    newContext: {},
  };
}

// ─── After-hours handler ──────────────────────────────────────────────────────

async function handleAfterHours(phoneNumber, body, doctor, patient, conversation) {
  await logMessage(conversation.id, 'inbound', body);

  // If they pick option 1 (symptoms), start triage even after hours
  if (body.trim() === '1' || detectSymptomCategory(body)) {
    const triageResp = await startTriageFlow(patient, doctor, body);
    if (triageResp) {
      await sendMessage(phoneNumber, triageResp.text);
      await logMessage(conversation.id, 'outbound', triageResp.text);
      await updateConversationState(conversation.id, triageResp.newState, triageResp.newContext);
      return;
    }
  }

  const msg = buildAfterHoursMessage(doctor.name, doctor.working_hours);
  await sendMessage(phoneNumber, msg);
  await logMessage(conversation.id, 'outbound', msg);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWithinWorkingHours(workingHours) {
  if (!workingHours) return true; // Default: always open

  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // 1=Mon…7=Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const allowedDays = workingHours.days || [1, 2, 3, 4, 5, 6];
  if (!allowedDays.includes(dayOfWeek)) return false;

  const [startH, startM] = (workingHours.start || '09:00').split(':').map(Number);
  const [endH, endM] = (workingHours.end || '18:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

async function getOrCreateConversation(patient, doctor, phoneNumber) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patient.id)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      patient_id: patient.id,
      doctor_id: doctor.id,
      whatsapp_number: phoneNumber,
      state: STATE.IDLE,
      context: {},
    })
    .select()
    .single();

  return created;
}

async function resetConversation(conversationId, patient, doctor) {
  const { data } = await supabase
    .from('conversations')
    .update({ state: STATE.IDLE, context: {}, is_urgent: false, last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .single();
  return data;
}

async function updateConversationState(conversationId, state, context) {
  await supabase
    .from('conversations')
    .update({ state, context, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function logMessage(conversationId, direction, content, messageType = 'text') {
  await supabase.from('messages').insert({ conversation_id: conversationId, direction, content, message_type: messageType });
}

async function createUrgentAlert(patient, doctor, conversation, alertType, message) {
  // Mark conversation as urgent
  await supabase.from('conversations').update({ is_urgent: true }).eq('id', conversation.id);

  // Create alert record
  await supabase.from('alerts').insert({
    doctor_id: doctor.id,
    patient_id: patient.id,
    conversation_id: conversation.id,
    alert_type: 'urgent_symptom',
    message: `${alertType}: ${message}`,
  });

  // Send WhatsApp alert to doctor
  const age = patient.age_years ? `${patient.age_years}` : null;
  await sendDoctorAlert(doctor.whatsapp_number || doctor.phone, patient.name, age, message);
}

module.exports = { handleIncomingMessage };
