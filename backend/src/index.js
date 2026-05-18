require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const patientRoutes = require('./routes/patients');
const faqRoutes = require('./routes/faqs');
const appointmentRoutes = require('./routes/appointments');
const webhookRoutes = require('./routes/webhook');
const { errorHandler } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));

// Raw body needed for Twilio webhook signature verification
app.use('/api/webhook', express.raw({ type: '*/*' }), webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TeleConnect backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
