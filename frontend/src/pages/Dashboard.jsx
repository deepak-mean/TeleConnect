import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../lib/api';
import { useDoctor } from '../hooks/useDoctor';
import AlertBanner from '../components/AlertBanner';

export default function Dashboard() {
  const { doctor } = useDoctor();
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

    Promise.all([
      api.get('/doctors/stats'),
      api.get('/appointments', { params: { from: todayStr, to: tomorrowStr } }),
    ]).then(([statsRes, apptRes]) => {
      setStats(statsRes.data);
      setAppointments(apptRes.data.appointments);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Patients', value: stats?.total_patients ?? '—', icon: '👤', color: 'text-blue-600' },
    { label: "Today's Appointments", value: stats?.appointments_today ?? '—', icon: '📅', color: 'text-green-600' },
    { label: 'Unread Alerts', value: stats?.unread_alerts ?? '—', icon: '🚨', color: 'text-red-600' },
    { label: 'Messages Today', value: stats?.messages_today ?? '—', icon: '💬', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Namaskar, Dr. {doctor?.name?.split(' ').slice(-1)[0] || 'Doctor'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      <AlertBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="card text-center">
            <div className="text-3xl mb-2">{icon}</div>
            <div className={`text-3xl font-bold ${color}`}>{loading ? '…' : value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Today's Appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Today's Appointments</h2>
          <Link to="/appointments" className="text-sm text-brand-600 hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading…</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            No appointments today
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 w-12 flex-shrink-0">
                  {format(new Date(appt.scheduled_at), 'HH:mm')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{appt.patients?.name}</div>
                  {appt.notes && <div className="text-xs text-gray-500 truncate">{appt.notes}</div>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
