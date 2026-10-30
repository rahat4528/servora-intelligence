'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ServoraLogo } from '@/components/brand/ServoraLogo';
import {
  Search,
  Filter,
  Send,
  Lock,
  User,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Shield,
  Phone,
  Mail,
  ChevronDown,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface Message {
  id: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | 'AI';
  senderName: string;
  content: string;
  createdAt: string;
}

interface InternalNote {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedAgent: string;
  tags: string[];
  unreadCount: number;
  lastMessageAt: string;
  messages: Message[];
  notes: InternalNote[];
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-101',
    title: 'Where is my courier delivery? (Order #CQ-9821)',
    customerName: 'Tanvir Hossain',
    customerEmail: 'tanvir@example.com',
    customerPhone: '+880 1711-223344',
    status: 'OPEN',
    priority: 'HIGH',
    assignedAgent: 'Agent Sarah',
    tags: ['courier', 'delivery-delay', 'calquick'],
    unreadCount: 1,
    lastMessageAt: '12m ago',
    messages: [
      {
        id: 'm1',
        senderType: 'CUSTOMER',
        senderName: 'Tanvir Hossain',
        content: 'Hi Servora team, I placed order #CQ-9821 three days ago via CalQuick courier but the status has not updated from In Transit. Can you please check?',
        createdAt: '12m ago',
      },
    ],
    notes: [
      {
        id: 'n1',
        authorName: 'Agent Sarah',
        content: 'Checked courier hub logs: parcel is currently undergoing customs clearance at Dhaka airport.',
        createdAt: '5m ago',
      },
    ],
  },
  {
    id: 'conv-102',
    title: 'Requesting refund for defective keyboard',
    customerName: 'Nusrat Jahan',
    customerEmail: 'nusrat@example.com',
    customerPhone: '+880 1812-345678',
    status: 'PENDING',
    priority: 'MEDIUM',
    assignedAgent: 'Agent Sarah',
    tags: ['refund', 'hardware'],
    unreadCount: 0,
    lastMessageAt: '2h ago',
    messages: [
      {
        id: 'm2',
        senderType: 'CUSTOMER',
        senderName: 'Nusrat Jahan',
        content: 'The mechanical keyboard arrived with a broken spacebar. I would like to request a replacement or refund.',
        createdAt: '2h ago',
      },
      {
        id: 'm3',
        senderType: 'AGENT',
        senderName: 'Agent Sarah',
        content: 'Hello Nusrat, I am sorry to hear that! Could you please provide a photo of the defect so we can prepare a refund draft for supervisor approval?',
        createdAt: '1h ago',
      },
    ],
    notes: [],
  },
  {
    id: 'conv-103',
    title: 'Banglish inquiry: Amar order ta kobe pabo?',
    customerName: 'Farhan Ahmed',
    customerEmail: 'farhan@example.com',
    customerPhone: '+880 1912-987654',
    status: 'OPEN',
    priority: 'MEDIUM',
    assignedAgent: 'Unassigned',
    tags: ['banglish', 'order-status'],
    unreadCount: 2,
    lastMessageAt: '8m ago',
    messages: [
      {
        id: 'm4',
        senderType: 'CUSTOMER',
        senderName: 'Farhan Ahmed',
        content: 'Bhai amar order #CQ-4412 ta kobe deliver kora hobe? Emergency dorkar.',
        createdAt: '8m ago',
      },
    ],
    notes: [],
  },
];

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>('conv-101');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [composerMode, setComposerMode] = useState<'REPLY' | 'NOTE'>('REPLY');
  const [composerText, setComposerText] = useState<string>('');

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    if (composerMode === 'REPLY') {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        senderType: 'AGENT',
        senderName: 'Agent Sarah',
        content: composerText.trim(),
        createdAt: 'Just now',
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, messages: [...c.messages, newMsg], lastMessageAt: 'Just now' }
            : c,
        ),
      );
    } else {
      const newNote: InternalNote = {
        id: `note-${Date.now()}`,
        authorName: 'Agent Sarah',
        content: composerText.trim(),
        createdAt: 'Just now',
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, notes: [...c.notes, newNote] } : c,
        ),
      );
    }

    setComposerText('');
  };

  const handleUpdateStatus = (newStatus: Conversation['status']) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, status: newStatus } : c)),
    );
  };

  const handleAssignAgent = (newAgent: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, assignedAgent: newAgent } : c)),
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <ServoraLogo variant="lockup" size={32} />
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            Tenant: default-org
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-200 font-medium">Agent Sarah</span>
            <span className="text-slate-400">(Support Agent)</span>
          </div>
        </div>
      </header>

      {/* 3-Pane Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Conversations List */}
        <section className="w-80 md:w-96 border-r border-slate-800/80 flex flex-col bg-slate-900/40 shrink-0">
          {/* Search & Filters Header */}
          <div className="p-3 border-b border-slate-800/80 flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations, customers, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium pb-1">
              {(['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Items Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No conversations match the selected filter.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600/10 border-l-4 border-blue-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 truncate max-w-[200px]">
                        {conv.customerName}
                      </span>
                      <span className="text-[10px] text-slate-500">{conv.lastMessageAt}</span>
                    </div>

                    <div className="text-xs font-medium text-slate-300 line-clamp-1">
                      {conv.title}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          conv.status === 'OPEN'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : conv.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {conv.status}
                      </span>

                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          conv.priority === 'HIGH' || conv.priority === 'URGENT'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {conv.priority}
                      </span>

                      {conv.unreadCount > 0 && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Pane 2: Conversation Active Thread & Composer */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">{activeConv.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>{activeConv.customerName}</span>
                <span>•</span>
                <span>{activeConv.customerEmail}</span>
              </div>
            </div>

            {/* Quick Status & Assignment Controls */}
            <div className="flex items-center gap-2.5">
              <select
                value={activeConv.status}
                onChange={(e) => handleUpdateStatus(e.target.value as any)}
                aria-label="Conversation Status"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="OPEN">Status: OPEN</option>
                <option value="PENDING">Status: PENDING</option>
                <option value="RESOLVED">Status: RESOLVED</option>
                <option value="CLOSED">Status: CLOSED</option>
              </select>

              <select
                value={activeConv.assignedAgent}
                onChange={(e) => handleAssignAgent(e.target.value)}
                aria-label="Assign Agent"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Agent Sarah">Assign: Agent Sarah</option>
                <option value="Agent Rahim">Assign: Agent Rahim</option>
                <option value="Unassigned">Assign: Unassigned</option>
              </select>
            </div>
          </div>

          {/* Messages & Notes Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Messages */}
            {activeConv.messages.map((msg) => {
              const isAgent = msg.senderType === 'AGENT';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${
                    isAgent ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">{msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.createdAt}</span>
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isAgent
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Internal Notes with Amber Background */}
            {activeConv.notes.map((note) => (
              <div
                key={note.id}
                className="mx-auto max-w-xl p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs"
              >
                <div className="flex items-center justify-between mb-1 text-[11px] font-semibold text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Internal Note by {note.authorName}</span>
                  </div>
                  <span className="text-amber-400/80">{note.createdAt}</span>
                </div>
                <p className="leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>

          {/* Message Composer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            {/* Mode Tabs: Reply vs Internal Note */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setComposerMode('REPLY')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  composerMode === 'REPLY'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Customer Reply</span>
              </button>

              <button
                type="button"
                onClick={() => setComposerMode('NOTE')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  composerMode === 'NOTE'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Internal Note (Private)</span>
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder={
                  composerMode === 'REPLY'
                    ? 'Write a reply to the customer...'
                    : 'Write an internal note only visible to team members...'
                }
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                className={`flex-1 px-3.5 py-2 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none border ${
                  composerMode === 'REPLY'
                    ? 'bg-slate-950 border-slate-800 focus:border-blue-500'
                    : 'bg-amber-950/20 border-amber-500/30 focus:border-amber-500'
                }`}
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow transition-all ${
                  composerMode === 'REPLY'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                }`}
              >
                <span>{composerMode === 'REPLY' ? 'Send' : 'Add Note'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </main>

        {/* Pane 3: Customer Context & AI Proposal Hook Sidebar */}
        <aside className="w-72 border-l border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-6 overflow-y-auto shrink-0 hidden lg:flex">
          {/* Customer Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Customer Profile</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-semibold text-slate-200">{activeConv.customerName}</p>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <p className="font-semibold text-slate-200">{activeConv.customerEmail}</p>
              </div>
              {activeConv.customerPhone && (
                <div>
                  <span className="text-slate-500">Phone:</span>
                  <p className="font-semibold text-slate-200">{activeConv.customerPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-violet-400" />
              <span>Conversation Tags</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {activeConv.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* AI Intelligence Assistant Hook (Prepared for Phase 3) */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Servora AI Copilot</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              AI orchestration is in standby. Draft suggestions and automated grounded responses will activate in Phase 3.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

