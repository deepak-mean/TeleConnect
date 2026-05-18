const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Send a plain text WhatsApp message
async function sendMessage(to, body) {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    const message = await client.messages.create({
      from: FROM_NUMBER,
      to: toFormatted,
      body,
    });
    console.log(`Sent to ${to}: SID ${message.sid}`);
    return message;
  } catch (err) {
    console.error(`Failed to send WhatsApp to ${to}:`, err.message);
    throw err;
  }
}

// Send urgent alert to doctor
async function sendDoctorAlert(doctorPhone, patientName, age, symptomSummary) {
  const ageStr = age ? `${age} saal` : '';
  const body = `🚨 ZARURI ALERT
Patient: ${patientName}${ageStr ? ` (${ageStr})` : ''}
Symptoms: ${symptomSummary}
Time: ${new Date().toLocaleTimeString('hi-IN')}

Reply karein:
1 - Patient ko call karein
2 - Message bhejein
3 - Dekha, manage ho jayega`;

  return sendMessage(doctorPhone, body);
}

// Send after-hours auto response
function buildAfterHoursMessage(doctorName, workingHours) {
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNames = (workingHours?.days || [1,2,3,4,5,6]).map(d => days[d]).join(', ');

  return `Namaskar! Dr. ${doctorName} abhi available nahi hain.
OPD time: ${workingHours?.start || '09:00'} - ${workingHours?.end || '18:00'} (${dayNames})

Agar yeh zaruri hai:
1️⃣ Symptoms batayein (hum guide karenge)
2️⃣ Kal appointment book karein
3️⃣ Emergency hai — 108 call karein`;
}

module.exports = { sendMessage, sendDoctorAlert, buildAfterHoursMessage };
