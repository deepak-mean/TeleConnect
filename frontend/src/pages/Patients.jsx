import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePatients } from '../hooks/usePatients';
import api from '../lib/api';

export default function Patients() {
  const [search, setSearch] = useState('');
  const { patients, total, loading, refetch, addPatient } = usePatients({ search });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp_number: '', age_years: '', age_months: '', guardian_name: '', language: 'hi' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addPatient({
        ...form,
        age_years: form.age_years ? Number(form.age_years) : null,
        age_months: form.age_months ? Number(form.age_months) : null,
      });
      toast.success('Patient added!');
      setShowAdd(false);
      setForm({ name: '', whatsapp_number: '', age_years: '', age_months: '', guardian_name: '', language: 'hi' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name or number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Add Patient Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Patient</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input" required placeholder="Aarav Sharma"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
                <input className="input" required placeholder="+919876543210"
                  value={form.whatsapp_number} onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
                  <input className="input" type="number" min="0" max="18" placeholder="3"
                    value={form.age_years} onChange={e => setForm(p => ({ ...p, age_years: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (months)</label>
                  <input className="input" type="number" min="0" max="11" placeholder="6"
                    value={form.age_months} onChange={e => setForm(p => ({ ...p, age_months: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                <input className="input" placeholder="Rohit Sharma"
                  value={form.guardian_name} onChange={e => setForm(p => ({ ...p, guardian_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select className="input" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Adding…' : 'Add Patient'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patients Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <p>No patients yet. Add your first patient!</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Age</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Guardian</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.whatsapp_number}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.age_years != null ? `${p.age_years}y` : ''}{p.age_months != null ? ` ${p.age_months}m` : ''}
                    {p.age_years == null && p.age_months == null ? '—' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.guardian_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{p.language}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
