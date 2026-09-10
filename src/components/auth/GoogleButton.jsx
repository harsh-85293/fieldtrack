import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

/**
 * Uses Google Identity Services ID token (credential JWT),
 * which the backend verifies with google-auth-library.
 */
export default function GoogleButton({ label = 'Continue with Google', onSuccess, onError, disabled }) {
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400"
      >
        Google sign-in not configured
      </button>
    );
  }

  return (
    <div className={`relative w-full ${disabled || loading ? 'pointer-events-none opacity-60' : ''}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm font-medium text-slate-500">Connecting…</span>
        </div>
      )}
      <div className="flex w-full justify-center">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            setLoading(true);
            try {
              if (!credentialResponse.credential) {
                throw new Error('No credential returned from Google');
              }
              await onSuccess(credentialResponse.credential);
            } catch (e) {
              onError?.(e);
            } finally {
              setLoading(false);
            }
          }}
          onError={() => {
            setLoading(false);
            onError?.(new Error('Google authentication failed'));
          }}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="360"
          locale="en"
          useOneTap={false}
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
