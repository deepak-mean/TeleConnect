import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSendOTP(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('otp');
      toast.success('OTP sent to your number!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);

    // Magic OTP for preview/demo
    if (otp === '1234') {
      localStorage.setItem('tc_mock_session', JSON.stringify({
        name: 'Dr. Priya Sharma',
        clinic_name: 'Sharma Pediatric Clinic',
        city: 'Mumbai', state: 'Maharashtra',
        phone: `+91${phone}`, language_preference: 'hi',
        verification_status: 'provisional',
        working_hours: { start: '09:00', end: '18:00', days: [1,2,3,4,5,6] },
      }));
      toast.success('Logged in (preview mode)');
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    try {
      const { data } = await api.post('/auth/verify-otp', { phone, token: otp });
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      toast.success('Logged in successfully!');
      navigate(data.isNewDoctor ? '/onboarding' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-2xl font-bold text-gray-900">TeleConnect</h1>
          <p className="text-gray-500 mt-1 text-sm">WhatsApp bot platform for your clinic</p>
        </div>

        <div className="card">
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <span className="input w-16 flex-shrink-0 bg-gray-50 text-gray-500 text-center">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input flex-1"
                    placeholder="9876543210"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading || phone.length !== 10}>
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                OTP sent to <strong>+91 {phone}</strong>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="ml-2 text-brand-600 underline text-xs"
                >
                  Change
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input text-center text-2xl tracking-widest"
                  placeholder="------"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>
              <button
                type="button"
                onClick={handleSendOTP}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
                disabled={loading}
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          For doctors only · Patient data is encrypted
        </p>
      </div>
    </div>
  );
}
