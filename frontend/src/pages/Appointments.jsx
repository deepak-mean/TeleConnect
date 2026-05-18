import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    setLoading(true);
    api.get('/appointments', {
      params: {
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      },
    }).then(({ data }) => {
      setAppointments(data.appointments);
    }).catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false));
  }, [weekStart.toISOString()]);

  async function updateStatus(id, status) {
    try {
      const { data } = await api.patch(`/appointments/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? data.appointment : a));
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error('Failed to update');
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>

        <div className="flex items-center gap-3">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="btn-secondary px-3">←</button>
          <span className="text-sm font-medium text-gray-600">
            {format(weekStart, 'dd MMM')} — {format(weekEnd, 'dd MMM yyyy')}
          </span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="btn-secondary px-3">→</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="btn-secondary text-xs">
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-r last:border-r-0 border-gray-100 ${
                  isSameDay(day, new Date()) ? 'bg-brand-50' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold mt-0.5 ${isSameDay(day, new Date()) ? 'text-brand-700' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 min-h-64">
            {weekDays.map(day => {
              const dayAppts = appointments.filter(a =>
                isSameDay(new Date(a.scheduled_at), day)
              );
              return (
                <div key={day.toISOString()} className="border-r last:border-r-0 border-gray-100 p-2 space-y-1 min-h-32">
                  {dayAppts.map(appt => (
                    <div key={appt.id} className="bg-white border border-gray-200 rounded p-2 text-xs shadow-sm">
                      <div className="font-medium text-gray-900 truncate">{appt.patients?.name}</div>
                      <div className="text-gray-500">{format(new Date(appt.scheduled_at), 'HH:mm')}</div>
                      <select
                        value={appt.status}
                        onChange={e => updateStatus(appt.id, e.target.value)}
                        className={`mt-1 w-full rounded px-1 py-0.5 text-xs border-0 font-medium cursor-pointer ${STATUS_STYLES[appt.status]}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view below calendar */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">This Week</h2>
        {appointments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No appointments this week</p>
        ) : (
          <div className="space-y-2">
            {appointments.map(appt => (
              <div key={appt.id} className="card flex items-center gap-4 py-3">
                <div className="text-sm text-gray-500 w-28 flex-shrink-0">
                  {format(new Date(appt.scheduled_at), 'EEE dd MMM, HH:mm')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{appt.patients?.name}</div>
                  <div className="text-xs text-gray-500">{appt.patients?.whatsapp_number}</div>
                </div>
                {appt.notes && <div className="text-sm text-gray-500 hidden md:block truncate max-w-xs">{appt.notes}</div>}
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[appt.status]}`}>
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
