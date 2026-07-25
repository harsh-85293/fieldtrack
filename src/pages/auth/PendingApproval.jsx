import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft } from 'lucide-react';

export default function PendingApproval({ user }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F6F8FC] px-5 py-10">
      <div className="w-full max-w-[460px] text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] shadow-lg shadow-[#2563EB]/25">
            <MapPin className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#172033]">FieldTrack</span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-10px_rgba(0,0,0,0.08)] sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
            Waiting for approval
          </h2>
          <p className="mt-3 text-sm text-[#64748B]">
            Registration submitted successfully. Your account is waiting for
            administrator approval. You'll be able to sign in once an
            administrator approves your request.
          </p>

          {user?.email && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-[#64748B]">
                Signed in as <span className="font-medium text-[#172033]">{user.email}</span>
              </p>
            </div>
          )}

          <Link
            to="/login"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-[#172033] shadow-sm transition-all duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
