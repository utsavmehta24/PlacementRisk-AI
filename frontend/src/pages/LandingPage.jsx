import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold">PlacementRisk AI</h1>
        <div className="flex gap-2">
          <Link to="/login" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">Sign In</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-5xl font-black leading-tight">Education Loan Support, Powered by Employability Intelligence</h2>
          <p className="mt-5 text-slate-300 text-lg">PlacementRisk AI predicts placement timelines, salary bands, and repayment risk, then converts those signals into actionable support workflows for officers and students.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/login" className="px-5 py-3 rounded bg-amber-400 text-slate-900 font-bold">Sign In to Portal</Link>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-xl font-semibold">Role Access</h3>
          <ul className="mt-4 space-y-3 text-slate-200 text-sm">
            <li className="flex gap-2"><span className="text-amber-400 font-bold">Admin</span> — institute portfolio, risk monitoring, operations control.</li>
            <li className="flex gap-2"><span className="text-blue-400 font-bold">Officer</span> — student cases, approvals, and communication workflows.</li>
            <li className="flex gap-2"><span className="text-emerald-400 font-bold">Student</span> — personal risk view, active case updates, and inbox support.</li>
          </ul>
          <div className="mt-5 flex flex-col gap-2">
            <Link to="/login" className="block text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Sign In</Link>
            <Link to="/student-signup" className="block text-center px-4 py-2 rounded-lg border border-slate-600 hover:border-blue-500 text-slate-200 text-sm">New Student? Create Account</Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Demo: admin@placementrisk.ai / riskhead@placementrisk.ai / officer@placementrisk.ai — all use password <span className="text-amber-300">demo123</span>
          </p>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;
