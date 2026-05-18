const express = require('express');
const twilio = require('twilio');
const { webhookLimiter } = require('../middleware/rateLimiter');
const { handleIncomingMessage } = require('../services/conversation');

const router = express.Router();

// GET /api/webhook — WhatsApp webhook verification (Meta)
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'teleconnect_verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Meta webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Verification failed' });
});

// POST /api/webhook — incoming WhatsApp messages (Twilio sandbox)
router.post('/', webhookLimiter, async (req, res) => {
  try {
    // Twilio signature verification
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers['x-twilio-signature'];
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const body = req.body.toString();

      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        Object.fromEntries(new URLSearchParams(body))
      );

      if (!isValid) {
        console.warn('Invalid Twilio signature');
        return res.status(403).send('Forbidden');
      }
    }

    // Parse Twilio's URL-encoded body
    const params = Object.fromEntries(
      new URLSearchParams(req.body.toString())
    );

    const from = params.From; // e.g. "whatsapp:+919876543210"
    const body = params.Body?.trim();
    const messageType = params.MediaContentType0 ? 'media' : 'text';

    if (!from || !body) {
      return res.status(200).send('<Response></Response>');
    }

    const phoneNumber = from.replace('whatsapp:', '');

    console.log(`Incoming [${messageType}] from ${phoneNumber}: ${body}`);

    // Handle asynchronously — respond to Twilio immediately
    handleIncomingMessage({ phoneNumber, body, messageType, params }).catch(err => {
      console.error('Error handling incoming message:', err);
    });

    // Twilio expects an empty TwiML response or we send via API
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

module.exports = router;
