import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Bot, FolderOpen, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, Button, Badge, Skeleton } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi, exploreApi, statusApi } from '../lib/api.js';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [saved, setSaved] = useState(null);
  const [trending, setTrending] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    // Refresh the user on mount so stats (ideas generated, mentor sessions)
    // reflect activity from other pages instead of the value cached at login.
    refreshUser();
    projectApi.listSaved().then((d) => setSaved(d.projects)).catch(() => setSaved([]));
    exploreApi.trending().then((d) => setTrending(d.trending)).catch(() => setTrending([]));
    statusApi.status().then(setAiStatus).catch(() => {});
  }, [refreshUser]);

  const stats = [
    { label: 'Ideas Generated', value: user?.stats?.ideasGenerated ?? 0, icon: Lightbulb },
    { label: 'Projects Saved', value: saved?.length ?? '—', icon: FolderOpen },
    { label: 'Mentor Sessions', value: user?.stats?.mentorSessions ?? 0, icon: Bot },
    { label: 'Active Projects', value: saved ? saved.filter((p) => p.status === 'in-progress').length : '—', icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-gray-400">Let's turn your skills into a standout final-year project.</p>
        </div>
        {aiStatus && (
          <Badge tone={aiStatus.aiEnabled ? 'emerald' : 'gray'}>
            {aiStatus.aiEnabled ? `⚡ ${aiStatus.label}` : aiStatus.label}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{s.label}</span>
              <s.icon className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="mt-2 text-3xl font-bold text-white tabular-nums">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="aurora relative overflow-hidden p-6">
          <Sparkles className="mb-3 h-7 w-7 text-indigo-200" />
          <h3 className="text-lg font-semibold text-white">Generate New Ideas</h3>
          <p className="mt-1 mb-4 text-sm text-gray-300">Get 5 scored ideas tailored to your profile.</p>
          <Button as={Link} to="/generate">Start generating <ArrowRight className="h-4 w-4" /></Button>
        </Card>
        <Card className="p-6">
          <Bot className="mb-3 h-7 w-7 text-fuchsia-300" />
          <h3 className="text-lg font-semibold text-white">Ask the AI Mentor</h3>
          <p className="mt-1 mb-4 text-sm text-gray-400">Get guidance on stack, architecture, timeline and more.</p>
          <Button as={Link} to="/mentor" variant="ghost">Open mentor <ArrowRight className="h-4 w-4" /></Button>
        </Card>
      </div>

      {/* Saved projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My Projects</h2>
          <Button as={Link} to="/generate" variant="subtle">+ New idea</Button>
        </div>
        {saved === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
        ) : saved.length === 0 ? (
          <Card className="p-6 text-sm text-gray-400">No saved projects yet. Generate some ideas and save your favourites.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((p) => (
              <Card key={p._id} className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{p.title}</h3>
                  <Badge tone={p.status === 'completed' ? 'emerald' : p.status === 'in-progress' ? 'amber' : 'gray'}>{p.status}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-gray-400">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(p.suggestedTechStack || []).slice(0, 3).map((t) => <Badge key={t} tone="indigo">{t}</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Skills & interests */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Your Skills & Interests</h2>
        <Card className="p-5">
          <div className="mb-3">
            <div className="mb-1.5 text-xs uppercase tracking-wide text-gray-500">Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {(user?.skills || []).map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
              {(!user?.skills || user.skills.length === 0) && <span className="text-sm text-gray-500">None yet</span>}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-gray-500">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {(user?.interests || []).map((s) => <Badge key={s} tone="emerald">{s}</Badge>)}
              {(!user?.interests || user.interests.length === 0) && <span className="text-sm text-gray-500">None yet</span>}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
