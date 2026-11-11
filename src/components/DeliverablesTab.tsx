import React, { useState } from 'react';
import { CheckCircle2, FileCode, Database, Terminal, Shield, BookOpen, Video, Award, ChevronRight } from 'lucide-react';

export const DeliverablesTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('README.md');

  const deliverables = [
    { id: 1, name: 'Source Code', status: 'Completed', file: 'server.ts & src/', desc: 'Complete Python & JavaScript application with full frontend and backend routes.' },
    { id: 2, name: 'Database Setup', status: 'Completed', file: 'schema.sql', desc: 'MySQL 8.0+ schema with constraints, indexes, decimal money fields, and seed data.' },
    { id: 3, name: 'README Documentation', status: 'Completed', file: 'README.md', desc: 'Setup guide, architecture, sample credentials, assumptions, and known limitations.' },
    { id: 4, name: 'API Documentation', status: 'Completed', file: 'README.md (Section 5)', desc: 'Complete JSON endpoints, HTTP status codes, request/response formats.' },
    { id: 5, name: 'Standalone SQL Queries', status: 'Completed', file: 'queries.sql', desc: 'All five requested queries with explanatory comments and sample execution.' },
    { id: 6, name: 'CSV Samples', status: 'Completed', file: 'sample_valid.csv & sample_invalid.csv', desc: 'Ready-to-use valid sample and error-demonstration CSV files.' },
    { id: 7, name: 'Automated Tests', status: 'Completed', file: 'test_suite.py & src/tests/*.test.ts', desc: 'Covers all 9 mandatory test scenarios from Part 12.' },
    { id: 8, name: 'Debugging Exercise', status: 'Completed', file: 'debugging_exercise.py', desc: 'Root cause explanation, edge case analysis, corrected function, and 12 unit tests.' },
    { id: 9, name: 'AI Usage Disclosure', status: 'Completed', file: 'AI_USAGE.md', desc: 'Complete Part 14 disclosure table with tools, prompts, review, and corrections.' },
    { id: 10, name: 'Demo Video Guide', status: 'Completed', file: 'DEMO_GUIDE.md', desc: 'Detailed 5–8 minute video walkthrough script and scene-by-scene demonstration plan.' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-serif">Submission Deliverables &amp; Technical Audit</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Savyant Systems Fresher/Trainee Software Developer Assignment — 10 of 10 Deliverables Ready
            </p>
          </div>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliverables.map(d => (
          <div
            key={d.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 shadow-lg hover:border-slate-700 transition"
          >
            <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-xs font-serif">
                  {d.id}. {d.name}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {d.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-amber-400/90">{d.file}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{d.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Interview Preparation Notes (Page 16 of PDF) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-100 font-serif">Technical Interview Discussion Guide (Page 16)</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Shortlisted candidates are expected to demonstrate understanding of the following five core themes during the interview:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-amber-300">1. Concurrency &amp; Stock Consistency</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              How we prevent race conditions when two users confirm orders for the same limited stock simultaneously:
              We employ pessimistic locking / serializable transaction isolation (<code className="text-emerald-400">SELECT ... FOR UPDATE</code> in SQL or mutex acquisition in memory). Stock is re-verified immediately after acquiring the lock; if stock is insufficient, the entire transaction rolls back atomically without deducting any items.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-amber-300">2. Transactional Atomicity</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Order status change (<code className="text-emerald-400">'Draft' &rarr; 'Confirmed'</code>), inventory deduction, and audit log generation (<code className="text-emerald-400">stock_movements</code>) are wrapped in a single database transaction. If any operation fails, all modifications are rolled back.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-amber-300">3. Insecure Direct Object Reference (IDOR) Protection</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Sales Users are strictly isolated to their own orders on the server side. Even if a user alters the URL or sends an order ID belonging to another user to <code className="text-amber-400">/api/orders/:id</code>, the backend verifies <code className="text-emerald-400">order.created_by === request.user.id</code> and denies access with <code className="text-rose-400">403 Forbidden</code>.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-amber-300">4. Financial Precision &amp; Frozen Rates</h3>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Rates are fetched from current product prices when adding line items, but frozen directly on the <code className="text-amber-400">sales_order_items</code> row. When a catalog price changes in the future, past order totals remain immutably fixed. All calculations use 2-decimal rounded arithmetic to eliminate floating-point drift.
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Repository Push & Submission Download Card */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-5 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-serif">GitHub Push &amp; Submission Package</h2>
              <p className="text-xs text-slate-400">
                Package Name: <span className="font-mono text-amber-400 font-semibold">ACharanVenkat_TechnicalAssignment</span>
              </p>
            </div>
          </div>
          <a
            href="/api/submission/download-zip"
            download="ACharanVenkat_TechnicalAssignment.zip"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950/50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Download Submission ZIP</span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Method A: Direct Push from Web UI */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-serif">Option A: Push Directly from App</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                Automated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter your GitHub repository URL and Personal Access Token (classic with <code className="text-amber-400">repo</code> scope or fine-grained token) to push directly:
            </p>

            <GitHubPushForm />
          </div>

          {/* Method B: Push from your local terminal */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-serif">Option B: Push via Terminal</span>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                Command Line
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If pushing from your computer or shell, run these commands in the project directory:
            </p>
            <pre className="bg-slate-900 text-slate-200 text-[11px] font-mono p-3 rounded-lg border border-slate-800 overflow-x-auto space-y-1">
              <div><span className="text-slate-500"># 1. Add your remote</span></div>
              <div className="text-amber-300">git remote add origin https://github.com/&lt;USERNAME&gt;/ACharanVenkat_TechnicalAssignment.git</div>
              <div className="mt-2"><span className="text-slate-500"># 2. Set default branch to main</span></div>
              <div className="text-amber-300">git branch -M main</div>
              <div className="mt-2"><span className="text-slate-500"># 3. Push all commits</span></div>
              <div className="text-emerald-400 font-bold">git push -u origin main</div>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const GitHubPushForm: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [pushing, setPushing] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    setPushing(true);
    setStatus(null);

    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token-admin'
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          token: token,
          branch: 'main'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ success: true, message: data.message });
      } else {
        setStatus({ success: false, message: data.error || 'Failed to push to GitHub' });
      }
    } catch (err: any) {
      setStatus({ success: false, message: err?.message || 'Network error while attempting git push' });
    } finally {
      setPushing(false);
    }
  };

  return (
    <form onSubmit={handlePush} className="space-y-3">
      <div>
        <label className="block text-[11px] font-medium text-slate-300 mb-1">GitHub Repository URL</label>
        <input
          type="text"
          required
          placeholder="https://github.com/charanathikari/ACharanVenkat_TechnicalAssignment.git"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-300 mb-1">
          Personal Access Token (PAT)
          <span className="text-slate-500 font-normal ml-1">(Required for private push)</span>
        </label>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>

      <button
        type="submit"
        disabled={pushing || !repoUrl}
        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition shadow-md flex items-center justify-center space-x-2"
      >
        {pushing ? (
          <>
            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
            <span>Pushing to GitHub...</span>
          </>
        ) : (
          <>
            <Terminal className="w-3.5 h-3.5" />
            <span>Push Commits to GitHub</span>
          </>
        )}
      </button>

      {status && (
        <div
          className={`p-3 rounded-lg text-xs border ${
            status.success
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          {status.message}
        </div>
      )}
    </form>
  );
};
