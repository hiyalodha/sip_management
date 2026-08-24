import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import api from '../utils/api';
import { saveSession } from '../utils/auth';
import PasswordInput from '../components/PasswordInput';

const inputClass =
  'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow';
const labelClass = 'text-xs font-medium text-ink-500 mb-1 block';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    panNumber: '',
    dob: '',
    password: '',
    phone: ''
  });
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
      const res = await api.post('/auth/signup', form);
      saveSession(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient px-4 py-10">
      <Head>
        <title>Sign up · SIP Manager</title>
      </Head>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl font-bold shadow-card-lg">
            S
          </span>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-card-lg border border-ink-200 p-8">
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-1">Create your account</h1>
          <p className="text-sm text-ink-500 mb-6">Start managing your SIP investments</p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input name="firstName" placeholder="Jane" required value={form.firstName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input name="lastName" placeholder="Doe" required value={form.lastName} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" placeholder="you@example.com" required value={form.email} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PAN number</label>
              <input name="panNumber" placeholder="ABCDE1234F" required value={form.panNumber} onChange={handleChange} className={`${inputClass} uppercase`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of birth</label>
                <input name="dob" type="date" required value={form.dob} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone (optional)</label>
                <input name="phone" placeholder="98765 43210" value={form.phone} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <PasswordInput name="password" placeholder="Min. 6 characters" required value={form.password} onChange={handleChange} className={inputClass} />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="text-sm text-ink-500 mt-6 text-center">
            Already have an account? <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
