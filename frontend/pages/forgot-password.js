import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import api from '../utils/api';
import PasswordInput from '../components/PasswordInput';

const inputClass =
  'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow';
const labelClass = 'text-xs font-medium text-ink-500 mb-1 block';

export default function ForgotPassword() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', panNumber: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: form.email,
        panNumber: form.panNumber,
        newPassword: form.newPassword
      });
      setSuccess(res.data.message || 'Password reset successfully.');
      setForm({ email: '', panNumber: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient px-4">
      <Head>
        <title>Reset password · SIP Manager</title>
      </Head>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl font-bold shadow-card-lg">
            S
          </span>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-card-lg border border-ink-200 p-8">
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Reset your password</h1>
          <p className="text-sm text-ink-500 mb-6">
            Verify your identity with your email and PAN number, then set a new password.
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
              {success} Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                name="email" type="email" placeholder="you@example.com" required value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>PAN number</label>
              <input
                name="panNumber" placeholder="ABCDE1234F" required value={form.panNumber}
                onChange={handleChange}
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <PasswordInput
                name="newPassword" placeholder="Min. 6 characters" required value={form.newPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm new password</label>
              <PasswordInput
                name="confirmPassword" placeholder="Re-enter new password" required value={form.confirmPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <p className="text-sm text-ink-500 mt-6 text-center">
            Remembered your password? <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
