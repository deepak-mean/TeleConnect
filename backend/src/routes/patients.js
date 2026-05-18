const express = require('express');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

// Helper: get doctor_id from phone
async function getDoctorId(phone) {
  const { data } = await supabase.from('doctors').select('id').eq('phone', phone).single();
  return data?.id;
}

// GET /api/patients — list all patients for the doctor
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return next(error);

    res.json({ patients: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id — single patient with conversation history
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', req.params.id)
      .eq('doctor_id', doctorId)
      .single();

    if (error || !patient) return res.status(404).json({ error: 'Patient not found' });

    // Fetch conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select(`*, messages(*)`)
      .eq('patient_id', patient.id)
      .order('last_message_at', { ascending: false })
      .limit(10);

    res.json({ patient, conversations: conversations || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients — add new patient
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { name, whatsapp_number, age_years, age_months, guardian_name, language, notes } = req.body;
    if (!name || !whatsapp_number) return res.status(400).json({ error: 'Name and WhatsApp number required' });

    const { data, error } = await supabase
      .from('patients')
      .insert({
        doctor_id: doctorId,
        name,
        whatsapp_number,
        age_years,
        age_months,
        guardian_name,
        language: language || 'hi',
        notes,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Patient with this WhatsApp number already exists' });
      return next(error);
    }

    res.status(201).json({ patient: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/patients/:id — update patient
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const allowed = ['name', 'age_years', 'age_months', 'guardian_name', 'language', 'notes'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', req.params.id)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error) return next(error);
    if (!data) return res.status(404).json({ error: 'Patient not found' });

    res.json({ patient: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/bulk-import — CSV import
router.post('/bulk-import', requireAuth, async (req, res, next) => {
  try {
    const doctorId = await getDoctorId(req.user.phone);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });

    const { patients } = req.body; // array of patient objects
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: 'patients array required' });
    }

    const records = patients.map(p => ({
      doctor_id: doctorId,
      name: p.name,
      whatsapp_number: p.whatsapp_number,
      age_years: p.age_years || null,
      age_months: p.age_months || null,
      guardian_name: p.guardian_name || null,
      language: p.language || 'hi',
      notes: p.notes || null,
    }));

    const { data, error } = await supabase
      .from('patients')
      .upsert(records, { onConflict: 'doctor_id,whatsapp_number', ignoreDuplicates: false })
      .select();

    if (error) return next(error);

    res.json({ imported: data.length, patients: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
