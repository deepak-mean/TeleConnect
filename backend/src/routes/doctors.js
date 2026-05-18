const express = require('express');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { verifyNMC } = require('../services/verification');
const { suggestFAQs } = require('../services/ai');

const router = express.Router();

// POST /api/doctors — create or update doctor profile (onboarding)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      name, clinic_name, city, state, specialization,
      nmc_number, working_hours, language_preference, whatsapp_number,
    } = req.body;

    const phone = req.user.phone;

    const { data, error } = await supabase
      .from('doctors')
      .upsert({
        phone,
        name,
        clinic_name,
        city,
        state,
        specialization: specialization || 'Pediatrician',
        nmc_number,
        working_hours,
        language_preference: language_preference || 'hi',
        whatsapp_number,
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (error) return next(error);
    res.status(201).json({ doctor: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/me — get own profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('phone', req.user.phone)
      .single();

    if (error) return next(error);
    res.json({ doctor: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/me — update own profile
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = [
      'name', 'clinic_name', 'city', 'state', 'specialization',
      'working_hours', 'language_preference', 'whatsapp_number',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('phone', req.user.phone)
      .select()
      .single();

    if (error) return next(error);
    res.json({ doctor: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors/verify-nmc — verify NMC registration number
router.post('/verify-nmc', requireAuth, async (req, res, next) => {
  try {
    const { nmc_number, doctor_name } = req.body;
    if (!nmc_number) return res.status(400).json({ error: 'NMC number required' });

    const result = await verifyNMC(nmc_number, doctor_name);

    // Update verification_status in DB
    await supabase
      .from('doctors')
      .update({
        nmc_number,
        verification_status: result.verified ? 'provisional' : 'pending',
      })
      .eq('phone', req.user.phone);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors/suggest-faqs — AI-generated FAQ suggestions
router.post('/suggest-faqs', requireAuth, async (req, res, next) => {
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('city, state, specialization, language_preference')
      .eq('phone', req.user.phone)
      .single();

    if (error) return next(error);

    const faqs = await suggestFAQs(doctor);
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/stats — dashboard stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('phone', req.user.phone)
      .single();

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [patientsRes, apptRes, alertsRes, msgsRes] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
      supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id)
        .gte('scheduled_at', todayISO),
      supabase.from('alerts').select('id', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id)
        .eq('is_read', false),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .gte('created_at', todayISO),
    ]);

    res.json({
      total_patients: patientsRes.count || 0,
      appointments_today: apptRes.count || 0,
      unread_alerts: alertsRes.count || 0,
      messages_today: msgsRes.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
