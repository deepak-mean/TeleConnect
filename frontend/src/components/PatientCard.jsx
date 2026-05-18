export default function PatientCard({ patient, onClick }) {
  const age = patient.age_years != null
    ? `${patient.age_years}y ${patient.age_months || 0}m`
    : patient.age_months != null ? `${patient.age_months}m` : '—';

  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(patient)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-gray-900">{patient.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {patient.guardian_name ? `Guardian: ${patient.guardian_name}` : ''}
          </div>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{age}</span>
      </div>
      <div className="mt-3 text-sm text-gray-600 flex items-center gap-1">
        <span>📱</span>
        {patient.whatsapp_number}
      </div>
      {patient.notes && (
        <div className="mt-2 text-xs text-gray-400 truncate">{patient.notes}</div>
      )}
    </div>
  );
}
