import React from 'react';
import { ServoraLogo } from '@/components/brand/ServoraLogo';
import {
  ShieldCheck,
  Zap,
  BookOpen,
  Boxes,
  Languages,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Activity,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-500/15 via-violet-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <ServoraLogo variant="lockup" size={44} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#governance" className="hover:text-white transition-colors">Governance &amp; Safety</a>
            <a href="http://localhost:4000/api/health" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Health
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#signin"
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href="#inbox"
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 rounded-lg shadow-lg shadow-blue-500/25 hover:opacity-95 transition-all"
            >
              Launch Platform
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="flex flex-col items-center text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-400 mb-8 backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Servora Intelligence v1.0 • Phase 1 Foundation Verified</span>
          </div>

          {/* Prominent Hero Logo Mark */}
          <div className="relative mb-8 group cursor-pointer">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/30 to-violet-600/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
            <div className="relative p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
              <ServoraLogo size={120} idSuffix="hero-main" />
            </div>
          </div>

          {/* Hero Headline */}
          <h1 className="max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            The Intelligent Support &amp; Operations Platform
          </h1>

          <p className="max-w-2xl text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
            Preserve your team&apos;s human workflow while empowering agents with grounded AI
            retrieval, verified tool execution, multilingual understanding, and human-in-the-loop approvals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href="#inbox"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Explore Operational Inbox</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="http://localhost:4000/api/health"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all"
            >
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Verify Health Check</span>
            </a>
          </div>

          {/* Quick Stats / Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl w-full border-t border-slate-850 pt-10 text-left">
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400 mt-1">Tenant-Isolated Architecture</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-xs text-slate-400 mt-1">Unapproved Financial Actions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">3 Languages</div>
              <div className="text-xs text-slate-400 mt-1">English, Bangla &amp; Banglish</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">pgvector</div>
              <div className="text-xs text-slate-400 mt-1">Tenant-Scoped RAG Engine</div>
            </div>
          </div>
        </div>

        {/* Core Pillars / Features */}
        <section id="features" className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Engineered for Enterprise Support Operations
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Built on strict security boundaries: AI assists and proposes, humans approve, and data stays strictly isolated.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Preserved Human Inbox</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Full conversation history, ticket assignment, manual routing, and internal notes remain fully operational even if AI providers face downtime.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Validated RAG Citations</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every generated response cites verified tenant documentation. Automated citation validators reject hallucinated or unbacked claims.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Human Approval Gate</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sensitive operations like refund submissions require explicit human authorization, cryptographic idempotency, and full audit logs.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <ServoraLogo size={28} idSuffix="footer" />
            <span>&copy; 2026 Servora Intelligence. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>PostgreSQL 16 (pgvector)</span>
            <span>Redis 7 (BullMQ)</span>
            <span>NestJS + Next.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

