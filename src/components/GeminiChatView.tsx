import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Globe,
  Shield,
  FileSearch,
  BookOpen,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Lock,
  Layers,
  Zap,
  Cpu,
  Brain
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  sources?: Array<{ uri: string; title: string }>;
  timestamp: number;
  modelUsed?: string;
}

const ROLES = [
  {
    id: 'sentinel',
    name: 'Cyber Defense Sentinel',
    icon: Shield,
    color: 'emerald',
    description: 'Expert in campus workstation isolation, USB worm mitigation, and network hygiene.',
    instruction:
      'You are the Campus Cyber Defense Sentinel for CleanDrop. Your mission is to protect university students, lab assistants, and researchers from USB-borne worms (Raspberry Robin, BadUSB, autorun scripts) and public workstation compromise. Provide rigorous, concise, and actionable guidance.',
    recommendedModel: 'gemini-3.5-flash',
  },
  {
    id: 'forensics',
    name: 'Payload & Hash Analyst',
    icon: FileSearch,
    color: 'cyan',
    description: 'Specializes in inspecting suspicious extensions, Shannon entropy, and file payloads.',
    instruction:
      'You are a Malware & Binary Forensics Specialist. Analyze file structures, SHA-256 signatures, high Shannon entropy, double extensions, and macro payloads. Explain reverse-engineering basics and sandbox isolation clearly.',
    recommendedModel: 'gemini-3.1-pro-preview',
  },
  {
    id: 'compliance',
    name: 'Compliance & FERPA Advisor',
    icon: BookOpen,
    color: 'violet',
    description: 'Guidance on academic confidentiality, HIPAA/FERPA student data, and secure transfers.',
    instruction:
      'You are the Academic Data Governance & FERPA Advisor. Guide students and faculty on ethical handling of research datasets, student grade sheets, and sensitive lab archives under academic compliance standards.',
    recommendedModel: 'gemini-3.1-flash-lite',
  },
];

const PRESET_QUERIES = [
  'What are the latest campus threats from USB worms like Raspberry Robin?',
  'How does Shannon entropy determine if an uploaded PDF is packed or malicious?',
  'Why is CleanDrop 10-minute auto-purge superior to leaving files on shared lab drives?',
  'What security headers prevent in-browser payload execution during file download?',
];

export const GeminiChatView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [searchGrounding, setSearchGrounding] = useState<boolean>(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content:
            `Hello! I am your **Campus Cyber Defense Sentinel**, powered by Gemini with live **Google Search Grounding**.\n\n` +
            `I can help you audit suspicious files, explain campus USB security policies, look up recent CVE vulnerabilities, or ensure your lab workstations stay free of ransomware and worms.\n\n` +
            `How can I assist your campus security today?`,
          timestamp: Date.now(),
          modelUsed: 'gemini-3.5-flash',
        },
      ]);
    }
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          systemInstruction: selectedRole.instruction,
          enableSearchGrounding: searchGrounding,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with Gemini AI.');
      }

      const modelMessage: ChatMessage = {
        role: 'model',
        content: data.reply || 'No response returned from security engine.',
        sources: data.sources || [],
        timestamp: Date.now(),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages((prev) => [...prev, modelMessage]);

      // Persist in Firestore if user is logged in
      if (user && !user.isAnonymous) {
        try {
          await addDoc(collection(db, 'chat_messages'), {
            userId: user.uid,
            role: 'user',
            content: userMessage.content,
            createdAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'chat_messages'), {
            userId: user.uid,
            role: 'model',
            content: modelMessage.content,
            sources: modelMessage.sources || [],
            modelUsed: modelMessage.modelUsed,
            createdAt: serverTimestamp(),
          });
        } catch (dbErr) {
          console.warn('Firestore chat logging notice:', dbErr);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ **Cyber Defense Sentinel Notice**: ${err.message || 'Unable to complete security consultation. Please try again.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'model',
        content: `Conversation refreshed. Select a security role or ask any question regarding campus file security, CVEs, or workstation isolation.`,
        timestamp: Date.now(),
        modelUsed: selectedModel,
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Chat Header & Control Bar */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base tracking-tight">Sentinel Security AI</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Multi-Turn Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Campus Malware & File Isolation Advisor
            </p>
          </div>
        </div>

        {/* Controls: Role, Model & Search Grounding */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Role Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/70 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-400 mr-2 font-medium hidden sm:inline">Role:</span>
            <select
              value={selectedRole.id}
              onChange={(e) => {
                const found = ROLES.find((r) => r.id === e.target.value);
                if (found) {
                  setSelectedRole(found);
                  setSelectedModel(found.recommendedModel);
                }
              }}
              className="bg-transparent text-emerald-300 font-medium focus:outline-none cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/70 rounded-xl px-2.5 py-1.5">
            <span className="text-slate-400 mr-2 font-medium hidden sm:inline">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-cyan-300 font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.5-flash" className="bg-slate-900 text-slate-200">
                gemini-3.5-flash (Search & General)
              </option>
              <option value="gemini-3.1-flash-lite" className="bg-slate-900 text-slate-200">
                gemini-3.1-flash-lite (Fast Tasks)
              </option>
              <option value="gemini-3.1-pro-preview" className="bg-slate-900 text-slate-200">
                gemini-3.1-pro-preview (Complex Tasks)
              </option>
            </select>
          </div>

          {/* Search Grounding Toggle */}
          <button
            onClick={() => setSearchGrounding(!searchGrounding)}
            title="Toggle Google Search Grounding for live intelligence"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all ${
              searchGrounding
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${searchGrounding ? 'text-blue-400 animate-spin-slow' : 'text-slate-500'}`} />
            <span className="text-[11px]">Google Search {searchGrounding ? 'ON' : 'OFF'}</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 flex-shrink-0 mt-1 shadow-md shadow-emerald-900/30">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-800/40 text-[11px]">
                <span className="font-semibold text-slate-400">
                  {msg.role === 'user' ? 'You (Campus Station)' : selectedRole.name}
                </span>
                <div className="flex items-center gap-2 font-mono text-slate-500">
                  {msg.modelUsed && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300">
                      {msg.modelUsed}
                    </span>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'model' && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy message"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-100">
                {msg.content}
              </div>

              {/* Grounded Web Sources (Google Search Grounding) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Grounding Sources (Google Search Intelligence):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40 text-[11px] text-blue-300 hover:text-white transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                        <span className="truncate max-w-[220px]">{src.title || src.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 flex-shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-300 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-xs font-mono text-slate-400">
                Consulting {selectedModel} {searchGrounding ? 'with Search Grounding...' : '...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Fast-Queries */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-500 flex-shrink-0 mr-1">
          Quick Topics:
        </span>
        {PRESET_QUERIES.map((preset, pIdx) => (
          <button
            key={pIdx}
            onClick={() => handleSendMessage(preset)}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-300 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1 relative bg-slate-900 border border-slate-800 rounded-xl focus-within:border-emerald-500/50 transition-all">
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask ${selectedRole.name} about USB isolation, payload scanning, or live CVEs... (Press Enter)`}
              rows={2}
              className="w-full bg-transparent text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 disabled:opacity-50 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
          <span>Active Role: <strong className="text-slate-400">{selectedRole.name}</strong></span>
          <span>Powered by Gemini & Google Search Grounding • Zero-trust verified</span>
        </div>
      </div>
    </div>
  );
};
