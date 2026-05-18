const axios = require('axios');

// NMC (National Medical Commission) verification
// Makes a request to NMC's public doctor registry
async function verifyNMC(nmcNumber, doctorName) {
  try {
    // NMC public registry endpoint
    const response = await axios.get(
      `https://www.nmc.org.in/MCIRest/open/getPaginatedData`,
      {
        params: {
          service: 'getDoctorOrHospitalByName',
          regNo: nmcNumber,
        },
        timeout: 10000,
        headers: { 'User-Agent': 'TeleConnect-Verification/1.0' },
      }
    );

    const data = response.data;

    // NMC returns an array of doctor records
    if (data && Array.isArray(data) && data.length > 0) {
      const record = data[0];
      const registeredName = (record.doctorName || '').toLowerCase().trim();
      const providedName = (doctorName || '').toLowerCase().trim();

      // Fuzzy name match — check if words overlap sufficiently
      const registeredWords = new Set(registeredName.split(/\s+/));
      const providedWords = providedName.split(/\s+/);
      const matchCount = providedWords.filter(w => w.length > 2 && registeredWords.has(w)).length;
      const nameMatch = matchCount >= Math.min(2, providedWords.length - 1);

      return {
        verified: nameMatch,
        registeredName: record.doctorName,
        qualification: record.qualification || '',
        stateCouncil: record.smcName || '',
        registrationDate: record.regDate || '',
        message: nameMatch
          ? 'NMC registration verified successfully'
          : 'Registration number found but name does not match',
      };
    }

    return {
      verified: false,
      message: 'NMC registration number not found. Will be reviewed manually.',
    };
  } catch (err) {
    console.error('NMC verification error:', err.message);

    // Don't block onboarding on NMC failure — mark for manual review
    return {
      verified: false,
      manualReview: true,
      message: 'NMC verification service unavailable. Your registration will be reviewed manually within 24 hours.',
    };
  }
}

module.exports = { verifyNMC };
