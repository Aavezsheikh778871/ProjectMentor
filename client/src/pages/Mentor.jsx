import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { Bot, Send, Plus, MessageSquare, Trash2, ArrowLeft } from 'lucide-react';
import { Button, Badge, Spinner, EmptyState } from '../components/ui.jsx';
import { mentorApi, projectApi } from '../lib/api.js';

const QUICK_PROMPTS = [
  'Explain the architecture',
  'What tech stack should I use?',
  'How to implement authentication?',
  'Suggest a database design',
  'Help with the project timeline',
  'Review my approach',
];

export default function Mentor() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [projects, setProjects] = useState([]);
  const [linkedProject, setLinkedProject] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    mentorApi.conversations().then((d) => setConversations(d.conversations)).catch(() => {});
    projectApi.listSaved().then((d) => setProjects(d.projects)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const openConversation = async (id) => {
    setActiveId(id);
    setMobileShowChat(true);
    try {
      const d = await mentorApi.conversation(id);
      setMessages(d.conversation.messages || []);
      setLinkedProject(d.conversation.projectIdeaId || '');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setMobileShowChat(true);
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    setSending(true);
    try {
      const data = await mentorApi.chat({
        message,
        conversationId: activeId || undefined,
        projectId: linkedProject || undefined,
      });
      setMessages(data.conversation.messages || []);
      if (!activeId && data.conversation?._id) {
        setActiveId(data.conversation._id);
        setConversations((c) => [data.conversation, ...c]);
      } else {
        setConversations((c) => c.map((x) => (x._id === data.conversation._id ? data.conversation : x)));
      }
    } catch (e) {
      toast.error(e.message);
      setMessages((m) => m.slice(0, -1)); // roll back the optimistic user message
    } finally {
      setSending(false);
    }
  };

  const removeConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await mentorApi.deleteConversation(id);
      setConversations((c) => c.filter((x) => x._id !== id));
      if (activeId === id) newChat();
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = conversations.filter((c) => (c.topic || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Sidebar */}
      <div className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="border-b border-white/10 p-3">
          <Button className="mb-2 w-full" onClick={newChat}><Plus className="h-4 w-4" /> New chat</Button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="p-3 text-sm text-gray-500">No conversations yet.</p>}
          {filtered.map((c) => (
            // Row is a div holding two real buttons — avoids invalid nested
            // <button> markup and keeps both actions keyboard-accessible.
            <div key={c._id}
              className={`group flex items-start gap-2 rounded-xl p-2.5 transition ${activeId === c._id ? 'bg-indigo-500/15' : 'hover:bg-white/5'}`}>
              <button onClick={() => openConversation(c._id)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-200">{c.topic}</div>
                  <div className="truncate text-xs text-gray-500">
                    {c.messages?.[c.messages.length - 1]?.content?.slice(0, 40) || 'No messages'}
                  </div>
                </div>
              </button>
              <button onClick={(e) => removeConversation(c._id, e)} className="shrink-0 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100" aria-label={`Delete conversation: ${c.topic}`}>
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <button className="lg:hidden" onClick={() => setMobileShowChat(false)} aria-label="Back"><ArrowLeft className="h-5 w-5 text-gray-400" /></button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold text-white">
              AI Project Mentor <span className="h-2 w-2 rounded-full bg-emerald-400" title="online" />
            </div>
            <div className="text-xs text-gray-500">Grounded in your selected project</div>
          </div>
          <select
            value={linkedProject}
            onChange={(e) => setLinkedProject(e.target.value)}
            className="max-w-[40%] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-gray-300 focus:border-indigo-400 focus:outline-none"
            aria-label="Link a project for context"
          >
            <option value="">No project context</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !sending && (
            <EmptyState icon={Bot} title="Ask your mentor anything" description="Link a project above for context, then ask about the stack, architecture, timeline, or where to start." />
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/20"><Bot className="h-4 w-4 text-indigo-300" /></div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white/[0.06] text-gray-200'}`}>
                {m.role === 'ai' ? <div className="md"><ReactMarkdown>{m.content}</ReactMarkdown></div> : m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/20"><Bot className="h-4 w-4 text-indigo-300" /></div>
              <div className="flex items-center gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {QUICK_PROMPTS.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={sending}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 transition hover:border-indigo-400/50 disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-white/10 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Ask your mentor… (Shift+Enter for a new line)"
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
