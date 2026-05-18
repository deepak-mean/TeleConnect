import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const DoctorContext = createContext(null);

export function DoctorProvider({ children }) {
  const [session, setSession] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDoctor();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDoctor();
      else { setDoctor(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchDoctor() {
    try {
      const { data } = await api.get('/doctors/me');
      setDoctor(data.doctor);
    } catch {
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setDoctor(null);
  }

  return (
    <DoctorContext.Provider value={{ session, doctor, loading, fetchDoctor, signOut }}>
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctor() {
  const ctx = useContext(DoctorContext);
  if (!ctx) {
    // Fallback for components not inside DoctorProvider — use local state
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });
    }, []);

    return { session, doctor: null, loading };
  }
  return ctx;
}
