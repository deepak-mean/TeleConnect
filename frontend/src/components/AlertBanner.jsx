import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.get('/appointments/alerts')
      .then(({ data }) => setAlerts(data.alerts.filter(a => !a.is_read)))
      .catch(() => {});
  }, []);

  async function dismiss(id) {
    await api.patch(`/appointments/alerts/${id}/read`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map(alert => (
        <div key={alert.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-xl flex-shrink-0">🚨</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-red-800 text-sm">
              URGENT — {alert.patients?.name}
              {alert.patients?.age_years ? ` (${alert.patients.age_years} yrs)` : ''}
            </div>
            <div className="text-red-700 text-sm mt-0.5">{alert.message}</div>
            <div className="text-red-500 text-xs mt-1">
              {new Date(alert.created_at).toLocaleTimeString()}
            </div>
          </div>
          <button
            onClick={() => dismiss(alert.id)}
            className="text-red-400 hover:text-red-600 flex-shrink-0 text-lg leading-none"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
