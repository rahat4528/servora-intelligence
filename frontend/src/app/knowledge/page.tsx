'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ServoraLogo } from '@/components/brand/ServoraLogo';
import {
  BookOpen,
  Search,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  type: string;
  version: number;
  chunks: number;
  updatedAt: string;
}

const DEFAULT_DOCS: KnowledgeDoc[] = [
  {
    id: 'src-1',
    title: 'Refund and Return Policy',
    type: 'POLICY',
    version: 1,
    chunks: 3,
    updatedAt: 'Today at 01:15',
  },
  {
    id: 'src-2',
    title: 'CalQuick Delivery Guidelines',
    type: 'MANUAL',
    version: 1,
    chunks: 2,
    updatedAt: 'Today at 01:20',
  },
  {
    id: 'src-3',
    title: 'Bangla & Banglish Support FAQs',
    type: 'FAQ',
    version: 1,
    chunks: 4,
    updatedAt: 'Yesterday',
  },
];

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(DEFAULT_DOCS);
  const [searchQuery, setSearchQuery] = useState<string>('What is the refund eligibility window?');
  const [testResults, setTestResults] = useState<{
    query: string;
    chunks: { title: string; section: string; score: number; text: string }[];
  }>({
    query: 'What is the refund eligibility window?',
    chunks: [
      {
        title: 'Refund and Return Policy',
        section: 'Section 1: Return Eligibility',
        score: 0.94,
        text: 'Customers are eligible to request a return or replacement within 14 days of confirmed package delivery. Items must be in original condition with intact packaging.',
      },
      {
        title: 'Refund and Return Policy',
        section: 'Section 3: Manager Approval & Submission',
        score: 0.78,
        text: 'All financial refunds require explicit authorization from an authorized Support Manager. Once approved, the refund draft is securely submitted through the CalQuick merchant portal.',
      },
    ],
  });

  const handleTestQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Simulate grounded retrieval
    if (searchQuery.toLowerCase().includes('kobe') || searchQuery.toLowerCase().includes('amar')) {
      setTestResults({
        query: searchQuery,
        chunks: [
          {
            title: 'CalQuick Delivery Guidelines',
            section: 'Section 2: Hub Transit Delays',
            score: 0.89,
            text: 'If a courier tracking status shows "Hub Transit" or "Customs Clearance" for more than 48 hours, agents must verify courier dispatch logs. Customers inquiring in Banglish ("amar order kobe pabo") should receive immediate tracking reassurance.',
          },
        ],
      });
    } else {
      setTestResults({
        query: searchQuery,
        chunks: [
          {
            title: 'Refund and Return Policy',
            section: 'Section 1: Return Eligibility',
            score: 0.91,
            text: 'Customers are eligible to request a return or replacement within 14 days of confirmed package delivery. Items must be in original condition with intact packaging.',
          },
        ],
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/inbox" className="hover:opacity-80 transition-opacity flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <ServoraLogo variant="lockup" size={32} />
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
            Tenant Knowledge Base • pgvector
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow"
          >
            Go to Inbox
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-violet-400" />
              <span>Knowledge Sources &amp; Retrieval Engine</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Tenant-scoped documents are chunked, embedded, and indexed in pgvector with verified source citations.
            </p>
          </div>

          <button className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-2 transition-all self-start sm:self-auto shadow-lg shadow-violet-500/20">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Documents Table */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Indexed Documents ({docs.length})</span>
          </h2>

          <div className="divide-y divide-slate-800">
            {docs.map((doc) => (
              <div key={doc.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold">{doc.type}</span>
                      <span>•</span>
                      <span>v{doc.version}</span>
                      <span>•</span>
                      <span>{doc.chunks} semantic chunks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Indexed</span>
                  </span>
                  <span className="text-slate-500 text-[11px]">{doc.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic Retrieval Tester */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Semantic Hybrid Retrieval Tester</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Test English, Bangla, and Banglish queries against your tenant pgvector index.
          </p>

          <form onSubmit={handleTestQuery} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question (e.g., 'What is the return window?', 'Bhai amar order kobe pabo?')"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-95 text-xs font-semibold text-white rounded-xl shadow transition-all"
            >
              Test Query
            </button>
          </form>

          {/* Retrieved Chunks Display */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Retrieved Chunks &amp; Validated Citations:
            </div>
            {testResults.chunks.map((res, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-violet-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                    <FileCheck className="w-4 h-4 text-violet-400" />
                    <span>{res.title} — {res.section}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-violet-500/15 text-violet-400">
                    Similarity: {(res.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{res.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

