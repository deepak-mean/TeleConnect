const express = require('express');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { suggestFAQs } = require('../services/ai');

const router = express.Router();

async function getDoctorId(phone) {
  const { data } = await supabase.from('doctors').select('id, city, state, specialization, language_preference').eq('phone', phone).single();
  return data;
}

// GET /api/faqs — list all FAQs for the doctor
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const { category, language, active_only } = req.query;

    let query = supabase
      .from('faqs')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('category')
      .order('created_at');

    if (category) query = query.eq('category', category);
    if (language) query = query.eq('language', language);
    if (active_only === 'true') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return next(error);

    res.json({ faqs: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/faqs — create FAQ
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const { question, answer, category, language, ai_suggested } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });

    const { data, error } = await supabase
      .from('faqs')
      .insert({
        doctor_id: doctor.id,
        question,
        answer,
        category: category || 'general',
        language: language || 'hi',
        ai_suggested: ai_suggested || false,
      })
      .select()
      .single();

    if (error) return next(error);
    res.status(201).json({ faq: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/faqs/bulk — save multiple FAQs at once (after onboarding AI suggestions)
router.post('/bulk', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const { faqs } = req.body;
    if (!Array.isArray(faqs) || faqs.length === 0) return res.status(400).json({ error: 'faqs array required' });

    const records = faqs.map(f => ({
      doctor_id: doctor.id,
      question: f.question,
      answer: f.answer,
      category: f.category || 'general',
      language: f.language || 'hi',
      ai_suggested: f.ai_suggested || false,
      is_active: true,
    }));

    const { data, error } = await supabase.from('faqs').insert(records).select();
    if (error) return next(error);

    res.status(201).json({ created: data.length, faqs: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/faqs/:id — update FAQ
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const allowed = ['question', 'answer', 'category', 'language', 'is_active'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('faqs')
      .update(updates)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .select()
      .single();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'FAQ not found' });

    res.json({ faq: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/faqs/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id);

    if (error) return next(error);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/faqs/ai-suggest — get more AI suggestions
router.post('/ai-suggest', requireAuth, async (req, res, next) => {
  try {
    const doctor = await getDoctorId(req.user.phone);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const faqs = await suggestFAQs(doctor);
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
