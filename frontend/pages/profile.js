import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordInput from '../components/PasswordInput';
import { useToast } from '../components/Toast';
import { BadgeStrip } from '../components/BadgeStrip';
import api from '../utils/api';
import { isAuthenticated, updateUser } from '../utils/auth';

const inputClass =
  'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow';
const labelClass = 'text-xs font-medium text-ink-500 mb-1 block';

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {description && <p className="text-sm text-ink-500 mt-1 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  );
}

export default function Profile() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUserData] = useState(null);
  const [phones, setPhones] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const [newPhone, setNewPhone] = useState('');
  const [addingPhone, setAddingPhone] = useState(false);

  const [otpTarget, setOtpTarget] = useState(null); // Phone_ID currently mid-verification
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [accountForm, setAccountForm] = useState({ accountNo: '', bankName: '', ifscCode: '' });
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const [confirmState, setConfirmState] = useState({ open: false });

  async function loadProfile() {
    try {
      const res = await api.get('/user/profile');
      setUserData(res.data.user);
      setPhones(res.data.phones);
      setAccounts(res.data.accounts);
      setProfileForm({ firstName: res.data.user.First_Name, lastName: res.data.user.Last_Name });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/user/profile', profileForm);
      updateUser({ firstName: profileForm.firstName, lastName: profileForm.lastName });
      showToast('Profile updated.');
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAddPhone(e) {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setAddingPhone(true);
    try {
      await api.post('/user/phone', { phoneNumber: newPhone.trim() });
      showToast('Phone number added.');
      setNewPhone('');
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add phone number', 'error');
    } finally {
      setAddingPhone(false);
    }
  }

  async function handleSendOtp(phoneId) {
    setSendingOtp(true);
    try {
      const res = await api.post(`/user/phone/${phoneId}/send-otp`);
      setOtpTarget(phoneId);
      setOtpCode('');
      // Simulated delivery: no SMS gateway is configured, so the code is shown
      // directly instead of being texted — this is a stand-in for a real OTP send.
      showToast(`Verification code (simulated SMS): ${res.data.simulatedCode}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send verification code', 'error');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp(phoneId) {
    if (!otpCode.trim()) {
      showToast('Enter the verification code first.', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      await api.post(`/user/phone/${phoneId}/verify-otp`, { code: otpCode.trim() });
      showToast('Phone number verified.');
      setOtpTarget(null);
      setOtpCode('');
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to verify phone number', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  }

  function handleDeletePhone(phoneId) {
    setConfirmState({
      open: true,
      title: 'Remove this phone number?',
      message: 'You can add it again later if needed.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/user/phone/${phoneId}`);
          showToast('Phone number removed.');
          loadProfile();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to remove phone number', 'error');
        }
      }
    });
  }

  async function handleAddAccount(e) {
    e.preventDefault();
    setAddingAccount(true);
    try {
      await api.post('/bank/create', accountForm);
      showToast('Bank account added.');
      setAccountForm({ accountNo: '', bankName: '', ifscCode: '' });
      setShowAddAccount(false);
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add bank account', 'error');
    } finally {
      setAddingAccount(false);
    }
  }

  function handleDeleteAccount(accountId) {
    setConfirmState({
      open: true,
      title: 'Remove this bank account?',
      message: 'You will not be able to pay installments from it until you add it again.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/bank/${accountId}`);
          showToast('Bank account removed.');
          loadProfile();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to remove bank account', 'error');
        }
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white border border-ink-200 animate-pulse" />
          ))}
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-8 text-center">
            <p className="text-ink-700 font-medium">Couldn&apos;t load your profile.</p>
            <p className="text-sm text-ink-500 mt-1">
              Make sure the backend server has been restarted to pick up the new profile routes, then refresh this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Profile · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Profile</h1>
          <p className="text-ink-500 mt-1">Manage your account details, password, phone numbers, and bank accounts.</p>
        </div>

        <BadgeStrip />

        {/* Account info */}
        <SectionCard title="Account details">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email</label>
                <input value={user.Email_ID} disabled className={`${inputClass} bg-ink-50 text-ink-400`} />
              </div>
              <div>
                <label className={labelClass}>PAN number</label>
                <input value={user.Pan_Number} disabled className={`${inputClass} bg-ink-50 text-ink-400`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input value={user.DOB} disabled className={`${inputClass} bg-ink-50 text-ink-400 w-1/2`} />
            </div>
            <button
              type="submit" disabled={savingProfile}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
            >
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </SectionCard>

        {/* Change password */}
        <SectionCard title="Change password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={labelClass}>Current password</label>
              <PasswordInput
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>New password</label>
                <PasswordInput
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={inputClass}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Confirm new password</label>
                <PasswordInput
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <button
              type="submit" disabled={savingPassword}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
            >
              {savingPassword ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </SectionCard>

        {/* Phone numbers */}
        <SectionCard
          title="Phone numbers"
          description="Verification is simulated for this project — no real SMS is sent, the code is shown on screen."
        >
          <div className="space-y-2 mb-4">
            {phones.length === 0 ? (
              <p className="text-sm text-ink-400">No phone numbers added yet.</p>
            ) : (
              phones.map((p) => (
                <div key={p.Phone_ID} className="border border-ink-100 rounded-lg px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-ink-700">{p.Phone_Number}</span>
                      {p.Is_Verified ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          Unverified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {!p.Is_Verified && otpTarget !== p.Phone_ID && (
                        <button
                          onClick={() => handleSendOtp(p.Phone_ID)}
                          disabled={sendingOtp}
                          className="text-primary-600 text-xs font-semibold hover:text-primary-700 disabled:opacity-60"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePhone(p.Phone_ID)}
                        className="text-red-600 text-xs font-semibold hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {otpTarget === p.Phone_ID && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-ink-100">
                      <input
                        placeholder="6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                        className="w-32 border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-900 tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        onClick={() => handleVerifyOtp(p.Phone_ID)}
                        disabled={verifyingOtp}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-card disabled:opacity-60 transition-colors"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Confirm code'}
                      </button>
                      <button
                        onClick={() => handleSendOtp(p.Phone_ID)}
                        disabled={sendingOtp}
                        className="text-xs font-medium text-ink-500 hover:text-ink-700 disabled:opacity-60"
                      >
                        Resend code
                      </button>
                      <button
                        onClick={() => { setOtpTarget(null); setOtpCode(''); }}
                        className="text-xs font-medium text-ink-400 hover:text-ink-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddPhone} className="flex gap-3">
            <input
              placeholder="98765 43210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit" disabled={addingPhone}
              className="shrink-0 bg-ink-900 hover:bg-ink-800 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              Add
            </button>
          </form>
        </SectionCard>

        {/* Bank accounts */}
        <SectionCard title="Bank accounts" description="Used to pay your SIP installments.">
          <div className="space-y-2 mb-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-ink-400">No bank accounts added yet.</p>
            ) : (
              accounts.map((a) => (
                <div key={a.Account_ID} className="flex items-center justify-between border border-ink-100 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{a.Bank_Name}</p>
                    <p className="text-xs text-ink-400">{a.Account_No} · {a.IFSC_Code}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteAccount(a.Account_ID)}
                    className="text-red-600 text-xs font-semibold hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {showAddAccount ? (
            <form onSubmit={handleAddAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <input
                placeholder="Account number" required
                value={accountForm.accountNo}
                onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Bank name" required
                value={accountForm.bankName}
                onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="IFSC code" required
                value={accountForm.ifscCode}
                onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value })}
                className={`${inputClass} uppercase`}
              />
              <div className="sm:col-span-3 flex gap-3">
                <button
                  type="submit" disabled={addingAccount}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
                >
                  {addingAccount ? 'Saving...' : 'Save account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAccount(false)}
                  className="text-sm font-medium text-ink-500 hover:text-ink-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddAccount(true)}
              className="text-sm text-primary-600 font-semibold hover:text-primary-700"
            >
              + Add bank account
            </button>
          )}
        </SectionCard>
      </main>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState({ open: false })} />
    </div>
  );
}
