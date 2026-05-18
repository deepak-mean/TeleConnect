import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STEPS = ['Basic Info', 'NMC Verification', 'FAQ Review', 'Clinic Hours', 'Done'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Basic info
  const [basicInfo, setBasicInfo] = useState({
    name: '', clinic_name: '', city: '', state: '',
    specialization: 'Pediatrician', whatsapp_number: '',
  });

  // Step 2 — NMC
  const [nmcNumber, setNmcNumber] = useState('');
  const [nmcResult, setNmcResult] = useState(null);
  const [nmcLoading, setNmcLoading] = useState(false);

  // Step 3 — FAQs
  const [suggestedFAQs, setSuggestedFAQs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [approvedFAQs, setApprovedFAQs] = useState(new Set());
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [editText, setEditText] = useState({ question: '', answer: '' });

  // Step 4 — Clinic hours
  const [workingHours, setWorkingHours] = useState({
    start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6],
  });
  const [languagePref, setLanguagePref] = useState('hi');

  // ─── Step handlers ────────────────────────────────────────────────────────

  async function handleBasicInfo(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/doctors', basicInfo);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save info');
    } finally {
      setLoading(false);
    }
  }

  async function handleNMCVerify() {
    if (!nmcNumber.trim()) return;
    setNmcLoading(true);
    try {
      const { data } = await api.post('/doctors/verify-nmc', {
        nmc_number: nmcNumber,
        doctor_name: basicInfo.name,
      });
      setNmcResult(data);
    } catch (err) {
      toast.error('NMC verification failed');
    } finally {
      setNmcLoading(false);
    }
  }

  async function handleLoadFAQs() {
    setFaqsLoading(true);
    try {
      const { data } = await api.post('/doctors/suggest-faqs');
      setSuggestedFAQs(data.faqs.map((f, i) => ({ ...f, _id: i })));
      // Auto-approve all by default
      setApprovedFAQs(new Set(data.faqs.map((_, i) => i)));
    } catch (err) {
      toast.error('Failed to generate FAQs');
    } finally {
      setFaqsLoading(false);
    }
  }

  async function handleSaveFAQs() {
    setLoading(true);
    try {
      const toSave = suggestedFAQs.filter(f => approvedFAQs.has(f._id));
      if (toSave.length > 0) {
        await api.post('/faqs/bulk', { faqs: toSave.map(({ _id, ...f }) => f) });
      }
      setStep(3);
    } catch (err) {
      toast.error('Failed to save FAQs');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await api.patch('/doctors/me', {
        working_hours: workingHours,
        language_preference: languagePref,
      });
      setStep(4);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(dayIndex) {
    setWorkingHours(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort(),
    }));
  }

  function startEditFAQ(faq) {
    setEditingFAQ(faq._id);
    setEditText({ question: faq.question, answer: faq.answer });
  }

  function saveEditFAQ() {
    setSuggestedFAQs(prev =>
      prev.map(f => f._id === editingFAQ ? { ...f, ...editText } : f)
    );
    setEditingFAQ(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < step ? 'bg-brand-600 text-white' :
                i === step ? 'bg-brand-100 text-brand-700 border-2 border-brand-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-brand-700' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <form onSubmit={handleBasicInfo} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Tell us about your clinic</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input className="input" placeholder="Dr. Priya Sharma" required
                    value={basicInfo.name} onChange={e => setBasicInfo(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
                  <input className="input" placeholder="Sharma Pediatric Clinic" required
                    value={basicInfo.clinic_name} onChange={e => setBasicInfo(p => ({ ...p, clinic_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input className="input" placeholder="Mumbai" required
                    value={basicInfo.city} onChange={e => setBasicInfo(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input className="input" placeholder="Maharashtra" required
                    value={basicInfo.state} onChange={e => setBasicInfo(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number for Alerts</label>
                  <input className="input" placeholder="+919876543210"
                    value={basicInfo.whatsapp_number} onChange={e => setBasicInfo(p => ({ ...p, whatsapp_number: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          )}

          {/* Step 1: NMC Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">NMC Registration</h2>
              <p className="text-sm text-gray-500">Enter your NMC number to verify your medical registration.</p>

              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="NMC Registration Number"
                  value={nmcNumber}
                  onChange={e => setNmcNumber(e.target.value)}
                />
                <button
                  onClick={handleNMCVerify}
                  className="btn-primary flex-shrink-0"
                  disabled={nmcLoading || !nmcNumber.trim()}
                >
                  {nmcLoading ? '…' : 'Verify'}
                </button>
              </div>

              {nmcResult && (
                <div className={`rounded-lg p-4 ${nmcResult.verified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className={`font-medium text-sm ${nmcResult.verified ? 'text-green-800' : 'text-yellow-800'}`}>
                    {nmcResult.verified ? '✅ Verified!' : '⚠️ Not verified'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{nmcResult.message}</div>
                  {nmcResult.registeredName && (
                    <div className="text-xs text-gray-500 mt-1">Registered as: {nmcResult.registeredName}</div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="btn-primary flex-1">
                  {nmcResult?.verified ? 'Continue →' : 'Skip for now →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: FAQ Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
                  <p className="text-sm text-gray-500 mt-1">AI-suggested FAQs for your patients. Approve, edit, or delete each one.</p>
                </div>
                {!suggestedFAQs.length && (
                  <button onClick={handleLoadFAQs} className="btn-primary flex-shrink-0" disabled={faqsLoading}>
                    {faqsLoading ? '⏳ Generating…' : '✨ Generate with AI'}
                  </button>
                )}
              </div>

              {suggestedFAQs.length > 0 && (
                <>
                  <div className="text-xs text-gray-500">{approvedFAQs.size} of {suggestedFAQs.length} approved</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {suggestedFAQs.map(faq => (
                      <div key={faq._id} className={`border rounded-lg p-3 transition-colors ${
                        approvedFAQs.has(faq._id) ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        {editingFAQ === faq._id ? (
                          <div className="space-y-2">
                            <input className="input text-sm" value={editText.question}
                              onChange={e => setEditText(p => ({ ...p, question: e.target.value }))} />
                            <textarea className="input text-sm resize-none" rows={3} value={editText.answer}
                              onChange={e => setEditText(p => ({ ...p, answer: e.target.value }))} />
                            <div className="flex gap-2">
                              <button onClick={saveEditFAQ} className="btn-primary text-xs py-1 px-3">Save</button>
                              <button onClick={() => setEditingFAQ(null)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-800">{faq.question}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{faq.answer}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{faq.category}</span>
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{faq.language}</span>
                              <div className="ml-auto flex gap-1">
                                <button
                                  onClick={() => setApprovedFAQs(prev => {
                                    const n = new Set(prev);
                                    n.has(faq._id) ? n.delete(faq._id) : n.add(faq._id);
                                    return n;
                                  })}
                                  className={`text-xs px-2 py-1 rounded ${approvedFAQs.has(faq._id) ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                                >
                                  {approvedFAQs.has(faq._id) ? '✓ Approved' : '+ Approve'}
                                </button>
                                <button onClick={() => startEditFAQ(faq)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">✏️</button>
                                <button
                                  onClick={() => {
                                    setSuggestedFAQs(prev => prev.filter(f => f._id !== faq._id));
                                    setApprovedFAQs(prev => { const n = new Set(prev); n.delete(faq._id); return n; });
                                  }}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                                >✕</button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSaveFAQs} className="btn-primary w-full" disabled={loading}>
                    {loading ? 'Saving…' : `Save ${approvedFAQs.size} FAQs & Continue →`}
                  </button>
                </>
              )}

              {!suggestedFAQs.length && !faqsLoading && (
                <button onClick={() => setStep(3)} className="btn-secondary w-full">
                  Skip this step →
                </button>
              )}
            </div>
          )}

          {/* Step 3: Clinic Hours */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Clinic Hours & Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => {
                    const dayNum = i + 1;
                    const active = workingHours.days.includes(dayNum);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(dayNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                  <input type="time" className="input" value={workingHours.start}
                    onChange={e => setWorkingHours(p => ({ ...p, start: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                  <input type="time" className="input" value={workingHours.end}
                    onChange={e => setWorkingHours(p => ({ ...p, end: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bot Language</label>
                <div className="flex gap-3">
                  {[['hi', 'Hindi'], ['en', 'English'], ['both', 'Both']].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="lang" value={val} checked={languagePref === val}
                        onChange={() => setLanguagePref(val)} className="accent-brand-600" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleFinish} className="btn-primary w-full" disabled={loading}>
                {loading ? 'Saving…' : 'Finish Setup →'}
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-5 py-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
              <p className="text-gray-500">
                Your WhatsApp clinic bot is ready. Share your WhatsApp number with patients and they can start chatting.
              </p>
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 text-left">
                <div className="text-sm font-medium text-brand-800 mb-1">Next steps:</div>
                <ul className="text-sm text-brand-700 space-y-1 list-disc list-inside">
                  <li>Add patient numbers from the Patients page</li>
                  <li>Review your FAQs and add more if needed</li>
                  <li>Configure your Twilio WhatsApp sandbox</li>
                </ul>
              </div>
              <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
