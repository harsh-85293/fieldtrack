import React, { useState, useId, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Clock,
  Route,
  BarChart3,
  Lock,
  User,
  AlertCircle,
  Check,
  ArrowRight,
  UserCheck,
  FileLock2,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { authService } from '../../api/services.js';
import GoogleButton from '../../components/auth/GoogleButton.jsx';
import PendingApproval from './PendingApproval.jsx';

function BrandPanel() {
  const features = [
    { icon: Clock, label: 'Real-time attendance', desc: 'Check-in and check-out with live timestamps' },
    { icon: Route, label: 'GPS-assisted field activity', desc: 'Location-tracked store visits and routes' },
    { icon: BarChart3, label: 'Actionable business reports', desc: 'Performance insights at a glance' },
  ];

  const trustIndicators = [
    { icon: UserCheck, label: 'Role-based access' },
    { icon: ShieldCheck, label: 'Admin-approved employees' },
    { icon: FileLock2, label: 'Secure activity records' },
  ];

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0B1F3A] py-16 px-14 xl:px-20">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#2563EB] opacity-[0.10] blur-[120px]" />
      <div className="pointer-events-none absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-[#10B981] opacity-[0.07] blur-[100px]" />

      {/* Map-grid background */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Route lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.08]"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M-20,140 C120,100 180,240 300,220 C420,200 480,340 620,300"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
        <path
          d="M-20,420 C100,400 200,480 320,440 C440,400 520,520 620,480"
          fill="none"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
        <path
          d="M-20,620 C140,580 260,660 380,620 C500,580 560,700 620,680"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
        {/* Waypoint pulses */}
        <g>
          <circle cx="300" cy="220" r="5" fill="#10B981" opacity="0.85" />
          <circle cx="300" cy="220" r="5" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="5;14;5" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3.5s" repeatCount="indefinite" />
          </circle>
        </g>
        <g>
          <circle cx="320" cy="440" r="5" fill="#2563EB" opacity="0.85" />
          <circle cx="320" cy="440" r="5" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="5;14;5" dur="3.5s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3.5s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
        <g>
          <circle cx="380" cy="620" r="5" fill="#10B981" opacity="0.85" />
          <circle cx="380" cy="620" r="5" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="5;14;5" dur="3.5s" begin="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3.5s" begin="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      {/* Logo + label */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] shadow-lg shadow-[#2563EB]/25">
            <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            FieldTrack
          </span>
        </div>
        <p className="mt-12 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#10B981]">
          Field Workforce Platform
        </p>
        <h1 className="mt-5 max-w-md text-[2rem] font-bold leading-[1.2] text-white xl:text-[2.4rem]">
          Your field team, in clear view.
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-300">
          Track attendance, field movement, store visits and daily performance
          from one secure platform.
        </p>
      </div>

      {/* Feature list */}
      <div className="relative z-10 space-y-5">
        {features.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="group flex items-start gap-3.5 transition-transform duration-200 hover:translate-x-1"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10 transition-colors duration-200 group-hover:bg-[#10B981]/10 group-hover:ring-[#10B981]/25">
              <Icon className="h-[18px] w-[18px] text-[#10B981]" />
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-medium text-slate-100">{label}</p>
              <p className="mt-0.5 text-[13px] text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust indicators strip */}
      <div className="relative z-10">
        <div className="grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-7">
          {trustIndicators.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-start gap-2">
              <Icon className="h-4 w-4 text-[#10B981]" />
              <p className="text-[11px] font-medium leading-tight text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} FieldTrack. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { login } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const navigate = useNavigate();
  const errorAlertId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGoogleSuccess = async (credential) => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const res = await authService.googleAuth(credential);
      const data = res.data.data;
      if (res.data.status === 'active') {
        toastSuccess('Signed in with Google');
        if (data.role === 'admin') navigate('/admin');
        else if (data.role === 'employee') navigate('/app');
        else navigate('/unauthorized');
        return;
      }
      if (res.data.status === 'pending') {
        setPendingUser(data);
        return;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Google authentication failed.';
      setApiError(msg);
      toastError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleLoading(false);
    setApiError('Google authentication failed. Please try again.');
    toastError('Google authentication failed.');
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { identifier: '', password: '', remember: false },
  });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const user = await login({
        identifier: data.identifier,
        password: data.password,
        remember: data.remember,
      });
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'employee') {
        navigate('/app');
      } else {
        navigate('/unauthorized');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setApiError(msg);
      toastError(msg);
    }
  };

  const hasErrors = Object.keys(errors).length > 0 || !!apiError;

  if (pendingUser) {
    return <PendingApproval user={pendingUser} />;
  }

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[45fr_55fr] overflow-hidden">
      {/* Left brand panel */}
      <BrandPanel />

      {/* Right login area */}
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F8FC] px-5 py-10 sm:px-8">
        <div
          className={`w-full max-w-[420px] transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] shadow-lg shadow-[#2563EB]/25">
              <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#172033]">
              FieldTrack
            </span>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-10px_rgba(0,0,0,0.08)] sm:p-10">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Sign in to continue to your FieldTrack workspace.
              </p>
            </div>

            {/* Error alert */}
            {hasErrors && (
              <div
                role="alert"
                aria-live="assertive"
                id={errorAlertId}
                className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div className="text-sm">
                  {apiError && <p className="font-medium text-red-700">{apiError}</p>}
                  {errors.identifier && (
                    <p className="text-red-600" id="identifier-error">
                      {errors.identifier.message}
                    </p>
                  )}
                  {errors.password && (
                    <p className="text-red-600" id="password-error">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              {/* Identifier */}
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-medium text-[#172033]"
                >
                  Employee ID or Email
                </label>
                <div className="group relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors duration-150 group-focus-within:text-[#2563EB]" />
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? `${errorAlertId} identifier-error` : undefined}
                    {...register('identifier', {
                      required: 'Employee ID or email is required',
                    })}
                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-4 text-sm text-[#172033] transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] ${
                      errors.identifier
                        ? 'border-red-400'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    placeholder="EMP001 or you@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#172033]"
                >
                  Password
                </label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors duration-150 group-focus-within:text-[#2563EB]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? `${errorAlertId} password-error` : undefined}
                    {...register('password', { required: 'Password is required' })}
                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-12 text-sm text-[#172033] transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] ${
                      errors.password
                        ? 'border-red-400'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors duration-150 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + help */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <span className="relative inline-flex">
                    <input
                      type="checkbox"
                      {...register('remember')}
                      className="peer sr-only"
                    />
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 border-slate-300 bg-white transition-all duration-150 peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB] peer-hover:border-slate-400 peer-focus-visible:ring-2 peer-focus-visible:ring-[#2563EB]/30 peer-focus-visible:ring-offset-1" />
                    <Check className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 scale-0 text-white transition-transform duration-150 peer-checked:scale-100" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-[#64748B]">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-sm font-medium text-[#2563EB] transition-colors duration-150 hover:text-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:rounded"
                >
                  Need help signing in?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-md shadow-[#2563EB]/20 transition-all duration-150 hover:bg-[#1D4ED8] hover:shadow-lg hover:shadow-[#2563EB]/25 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in&hellip;
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs font-medium text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* Google sign in */}
            <div className="mt-6">
              <GoogleButton
                label="Continue with Google"
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={googleLoading}
              />
            </div>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-[#64748B]">
              New employee?{' '}
              <Link
                to="/signup"
                className="font-semibold text-[#2563EB] transition-colors duration-150 hover:text-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:rounded"
              >
                Register with Google
              </Link>
            </p>

            {/* Security message */}
            <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" />
              <span className="text-[13px] text-[#64748B]">
                Your account is protected with secure authentication.
              </span>
            </div>
          </div>

          {/* Mobile footer */}
          <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
            &copy; {new Date().getFullYear()} FieldTrack. All rights reserved.
          </p>
        </div>
      </div>

      {/* Help modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF]">
                  <KeyRound className="h-[18px] w-[18px] text-[#2563EB]" />
                </div>
                <h3 id="help-modal-title" className="text-lg font-bold text-[#172033]">
                  Need help signing in?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                aria-label="Close help dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#64748B]">
              If you've forgotten your password or are having trouble accessing
              your account, please contact your administrator. They can reset
              your password or help you get set up.
            </p>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-md shadow-[#2563EB]/20 transition-all duration-150 hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
