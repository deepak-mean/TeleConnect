const express = require('express');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

async function getDoctorId(phone) {
  const { data } = await supabase.from('doctors').select('id').eq('phone', phone).single();
  return data?.id;
}

// GET /api/appointments — list appointments (filterable by date range)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { from, to, status } = req.query;

    let query = supabase
      .from('appointments')
      .select(`*, patients(name, whatsapp_number, age_years, age_months)`)
      .eq('doctor_id', doctorId)
      .order('scheduled_at');

    if (from) query = query.gte('scheduled_at', from);
    if (to) query = query.lte('scheduled_at', to);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return next(error);

    res.json({ appointments: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments — create appointment
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { patient_id, scheduled_at, notes, booked_via } = req.body;
    if (!patient_id || !scheduled_at) return res.status(400).json({ error: 'patient_id and scheduled_at required' });

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        doctor_id: doctorId,
        patient_id,
        scheduled_at,
        notes,
        booked_via: booked_via || 'dashboard',
      })
      .select(`*, patients(name, whatsapp_number)`)
      .single();

    if (error) return next(error);
    res.status(201).json({ appointment: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id — update status or notes
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const allowed = ['status', 'notes', 'scheduled_at'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', req.params.id)
      .eq('doctor_id', doctorId)
      .select(`*, patients(name, whatsapp_number)`)
      .single();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Appointment not found' });

    res.json({ appointment: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/alerts — unread urgent alerts
router.get('/alerts', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { data, error } = await supabase
      .from('alerts')
      .select(`*, patients(name, whatsapp_number, age_years, age_months)`)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return next(error);
    res.json({ alerts: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/alerts/:id/read — mark alert as read
router.patch('/alerts/:id/read', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { data, error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error) return next(error);
    res.json({ alert: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
