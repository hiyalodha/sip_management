import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import api from '../utils/api';
import { saveSession } from '../utils/auth';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      saveSession(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient px-4">
      <Head>
        <title>Log in · SIP Manager</title>
      </Head>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl font-bold shadow-card-lg">
            S
          </span>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-card-lg border border-ink-200 p-8">
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-ink-500 mb-6">Log in to manage your SIP investments</p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-500 mb-1 block">Email</label>
              <input
                name="email" type="email" placeholder="you@example.com" required value={form.email}
                onChange={handleChange}
                className="w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-ink-500 block">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                name="password" placeholder="••••••••" required value={form.password}
                onChange={handleChange}
                className="w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm text-ink-500 mt-6 text-center">
            Don&apos;t have an account? <Link href="/signup" className="text-primary-600 font-semibold hover:text-primary-700">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
