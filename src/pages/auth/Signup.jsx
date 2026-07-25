import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, ArrowLeft, CheckCircle2, Users } from 'lucide-react';
import GoogleButton from '../../components/auth/GoogleButton.jsx';
import { authService } from '../../api/services.js';
import { useToast } from '../../components/ui/Toast.jsx';

export default function Signup() {
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState('');
  const { toastError, toastSuccess } = useToast();

  const handleGoogleSuccess = async (credential) => {
    setError('');
    try {
      const res = await authService.googleAuth(credential);
      const data = res.data.data;
      if (res.data.status === 'active') {
        toastSuccess('Account is active. Please sign in.');
        window.location.href = '/login';
        return;
      }
      if (res.data.status === 'pending') {
        setPendingUser(data);
        toastSuccess('Google account verified. Complete your registration.');
        return;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Google authentication failed.';
      setError(msg);
      toastError(msg);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
    toastError('Google authentication failed.');
  };

  // If pending user needs to complete profile, show the completion form
  if (pendingUser) {
    return <CompleteProfile user={pendingUser} onDone={() => setPendingUser(null)} />;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F8FC] px-5 py-10">
      <div className="w-full max-w-[460px]">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] shadow-lg shadow-[#2563EB]/25">
            <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#172033]">FieldTrack</span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-10px_rgba(0,0,0,0.08)] sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
            Create your employee account
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Sign up with your company Google account. After verification, your
            registration is sent to an administrator for approval before you can
            access FieldTrack.
          </p>

          {/* Approval notice */}
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">Admin approval required.</span> New
              employee accounts require administrator approval before access is
              granted.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-7">
            <GoogleButton
              label="Continue with Google"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          {/* What happens next */}
          <div className="mt-7 space-y-3 border-t border-slate-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              What happens next
            </p>
            {[
              'Verify your identity with Google',
              'Complete your Employee ID and phone number',
              'Wait for administrator approval',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-semibold text-[#2563EB]">
                  {i + 1}
                </div>
                <span className="text-sm text-[#64748B]">{step}</span>
              </div>
            ))}
          </div>

          {/* Back to sign in */}
          <div className="mt-8 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-6">
            <ArrowLeft className="h-4 w-4 text-slate-400" />
            <Link
              to="/login"
              className="text-sm font-medium text-[#2563EB] transition-colors duration-150 hover:text-[#1D4ED8]"
            >
              Back to sign in
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} FieldTrack. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function CompleteProfile({ user, onDone }) {
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { toastError, toastSuccess } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!employeeId.trim() || !phone.trim()) {
      setError('Employee ID and phone number are required');
      return;
    }
    setSubmitting(true);
    try {
      await authService.completeGoogleProfile({
        providerId: user.providerId,
        employeeId: employeeId.trim(),
        phone: phone.trim(),
      });
      setDone(true);
      toastSuccess('Registration submitted successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit registration.';
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F8FC] px-5 py-10">
        <div className="w-full max-w-[460px] text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
            <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
            Registration submitted
          </h2>
          <p className="mt-3 text-sm text-[#64748B]">
            Registration submitted successfully. Your account is waiting for
            administrator approval. You'll be able to sign in once an
            administrator approves your request.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-md shadow-[#2563EB]/20 transition-all duration-150 hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F8FC] px-5 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] shadow-lg shadow-[#2563EB]/25">
            <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#172033]">FieldTrack</span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-10px_rgba(0,0,0,0.08)] sm:p-10">
          {/* User info */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.fullName}
                className="h-12 w-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-semibold text-[#2563EB]">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#172033]">{user.fullName}</p>
              <p className="text-xs text-[#64748B]">{user.email}</p>
            </div>
          </div>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-[#172033]">
            Complete your profile
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Enter your Employee ID and phone number to finish your registration.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="employeeId" className="mb-2 block text-sm font-medium text-[#172033]">
                Employee ID
              </label>
              <input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP001"
                className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-[#172033] transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] hover:border-slate-400"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#172033]">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-[#172033] transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] hover:border-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-md shadow-[#2563EB]/20 transition-all duration-150 hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
