const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const router = express.Router();

// POST /api/auth/send-otp
// Sends OTP to doctor's phone via Supabase Auth
router.post('/send-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Normalize: ensure +91 prefix for India
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;

    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabaseAnon.auth.signInWithOtp({ phone: normalized });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: 'OTP sent', phone: normalized });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
// Verifies OTP and returns session
router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ error: 'Phone and OTP token required' });

    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;

    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseAnon.auth.verifyOtp({
      phone: normalized,
      token,
      type: 'sms',
    });

    if (error) return res.status(400).json({ error: error.message });

    // Check if doctor profile exists
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, name, verification_status, clinic_name')
      .eq('phone', normalized)
      .single();

    res.json({
      success: true,
      session: data.session,
      user: data.user,
      doctor: doctor || null,
      isNewDoctor: !doctor,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('phone', req.user.phone)
      .single();

    if (error && error.code !== 'PGRST116') return next(error);

    res.json({ user: req.user, doctor: doctor || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
