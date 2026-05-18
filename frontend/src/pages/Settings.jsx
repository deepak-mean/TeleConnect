import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useDoctor } from '../hooks/useDoctor';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Settings() {
  const { doctor, fetchDoctor } = useDoctor();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clinic_name: '',
    whatsapp_number: '',
    language_preference: 'hi',
    working_hours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
  });

  useEffect(() => {
    if (doctor) {
      setForm({
        clinic_name: doctor.clinic_name || '',
        whatsapp_number: doctor.whatsapp_number || '',
        language_preference: doctor.language_preference || 'hi',
        working_hours: doctor.working_hours || { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
      });
    }
  }, [doctor]);

  function toggleDay(dayNum) {
    setForm(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        days: prev.working_hours.days.includes(dayNum)
          ? prev.working_hours.days.filter(d => d !== dayNum)
          : [...prev.working_hours.days, dayNum].sort(),
      },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/doctors/me', form);
      await fetchDoctor();
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Clinic Info */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">Clinic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
            <input className="input" value={form.clinic_name}
              onChange={e => setForm(p => ({ ...p, clinic_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number (for alerts)</label>
            <input className="input" placeholder="+919876543210" value={form.whatsapp_number}
              onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Urgent patient alerts will be sent to this number</p>
          </div>
        </div>

        {/* Working Hours */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">OPD Hours</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, i) => {
                const dayNum = i + 1;
                const active = form.working_hours.days.includes(dayNum);
                return (
                  <button
                    key={day}
                    type="button"
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
              <input type="time" className="input"
                value={form.working_hours.start}
                onChange={e => setForm(p => ({ ...p, working_hours: { ...p.working_hours, start: e.target.value } }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
              <input type="time" className="input"
                value={form.working_hours.end}
                onChange={e => setForm(p => ({ ...p, working_hours: { ...p.working_hours, end: e.target.value } }))} />
            </div>
          </div>
        </div>

        {/* Bot Language */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">Bot Language</h2>
          <div className="flex gap-4">
            {[['hi', 'Hindi'], ['en', 'English'], ['both', 'Both']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="lang"
                  value={val}
                  checked={form.language_preference === val}
                  onChange={() => setForm(p => ({ ...p, language_preference: val }))}
                  className="accent-brand-600"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-100 space-y-3">
          <h2 className="font-bold text-red-700">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">Pause Bot</div>
              <div className="text-xs text-gray-500">Bot will not respond to any messages</div>
            </div>
            <button type="button" className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => toast('Bot pause coming soon!', { icon: '⚠️' })}>
              Pause Bot
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
