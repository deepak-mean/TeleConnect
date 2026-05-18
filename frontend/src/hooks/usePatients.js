import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export function usePatients({ search = '', page = 1, limit = 50 } = {}) {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const { data } = await api.get('/patients', { params });
      setPatients(data.patients);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  async function addPatient(patientData) {
    const { data } = await api.post('/patients', patientData);
    await fetchPatients();
    return data.patient;
  }

  async function updatePatient(id, updates) {
    const { data } = await api.patch(`/patients/${id}`, updates);
    setPatients(prev => prev.map(p => p.id === id ? data.patient : p));
    return data.patient;
  }

  return { patients, total, loading, error, refetch: fetchPatients, addPatient, updatePatient };
}
