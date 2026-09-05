import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Layers, Cpu, CalendarRange, Network, FileText, Bookmark, Copy } from 'lucide-react';
import { Button, Badge, Spinner, ScoreDots } from './ui.jsx';
import { projectApi, generateApi } from '../lib/api.js';

const TABS = [
  { key: 'features', label: 'Features', icon: Layers },
  { key: 'stack', label: 'Tech Stack', icon: Cpu },
  { key: 'roadmap', label: 'Roadmap', icon: CalendarRange },
  { key: 'architecture', label: 'Architecture', icon: Network },
  { key: 'abstract', label: 'Abstract', icon: FileText },
];

export default function IdeaDetailModal({ idea, source, onClose, onSave }) {
  const [tab, setTab] = useState('features');
  const [featureTab, setFeatureTab] = useState('mvp');
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [abstract, setAbstract] = useState(null);
  const [loadingAbstract, setLoadingAbstract] = useState(false);
  const [savedProject, setSavedProject] = useState(null);
  const dialogRef = useRef(null);

  // Save the idea (so it has an id), then fetch its detailed plan.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlan(true);
      const project = await onSave(idea);
      if (!project || cancelled) return;
      setSavedProject(project);
      try {
        const data = await projectApi.details(project._id);
        if (!cancelled) setPlan(data.plan);
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadAbstract = async () => {
    if (abstract || loadingAbstract) return;
    setLoadingAbstract(true);
    try {
      const data = await generateApi.abstract({ title: idea.title, description: idea.description, domain: idea.domain });
      setAbstract(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingAbstract(false);
    }
  };

  const copyAbstract = () => {
    if (!abstract) return;
    navigator.clipboard.writeText(abstract.abstract);
    toast.success('Abstract copied');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${idea.title}`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d0d18] shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge tone="indigo">{idea.domain}</Badge>
              <Badge tone="gray">{idea.difficultyLevel}</Badge>
              <Badge tone={source === 'ai' ? 'emerald' : 'gray'}>{source === 'ai' ? 'AI' : 'Offline engine'}</Badge>
            </div>
            <h2 className="text-xl font-bold text-white">{idea.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overview */}
        <div className="space-y-3 border-b border-white/10 p-5">
          <p className="text-sm text-gray-300"><span className="font-medium text-white">Problem: </span>{idea.problemStatement}</p>
          <p className="text-sm text-gray-400">{idea.description}</p>
          <p className="text-sm text-gray-400"><span className="font-medium text-indigo-300">Why it's innovative: </span>{idea.innovationFactor}</p>
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <ScoreDots label="Feasibility" value={idea.feasibilityScore} />
            <ScoreDots label="Industry relevance" value={idea.industryRelevanceScore} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 pt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'abstract') loadAbstract(); }}
              className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? 'bg-white/5 text-indigo-200' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[240px] p-5">
          {loadingPlan && tab !== 'abstract' ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner className="h-4 w-4" /> Building your project plan…</div>
          ) : (
            <>
              {tab === 'features' && plan && (
                <div>
                  <div className="mb-4 inline-flex rounded-lg border border-white/10 p-0.5">
                    {['mvp', 'advanced'].map((ft) => (
                      <button key={ft} onClick={() => setFeatureTab(ft)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${featureTab === ft ? 'bg-indigo-500 text-white' : 'text-gray-400'}`}>
                        {ft === 'mvp' ? 'MVP' : 'Advanced'}
                      </button>
                    ))}
                  </div>
                  <ul className="space-y-3">
                    {plan.features[featureTab].map((f, i) => (
                      <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="font-medium text-white">{f.title}</div>
                        <div className="text-sm text-gray-400">{f.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === 'stack' && plan && (
                <div className="space-y-3">
                  {plan.techStack.map((s, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{s.choice}</span>
                        <Badge tone="gray">{s.layer}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">{s.justification}</p>
                      {s.alternative && <p className="mt-1 text-xs text-gray-500">Alternative: {s.alternative}</p>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'roadmap' && plan && (
                <ol className="relative space-y-4 border-l border-white/10 pl-5">
                  {plan.developmentSteps.map((p, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full bg-indigo-500 text-[10px] text-white">{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{p.phase}</span>
                        <Badge tone="indigo">{p.duration}</Badge>
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-sm text-gray-400">
                        {p.tasks.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}

              {tab === 'architecture' && plan && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">{plan.architectureSummary}</p>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">API endpoints</div>
                    <div className="space-y-1.5">
                      {plan.apiEndpoints.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge tone="emerald">{e.method}</Badge>
                          <code className="text-gray-300">{e.path}</code>
                          <span className="text-gray-500">— {e.purpose}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Diagram (Mermaid)</div>
                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-gray-300">{plan.architectureDiagram}</pre>
                  </div>
                </div>
              )}

              {tab === 'abstract' && (
                <div>
                  {loadingAbstract && <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner className="h-4 w-4" /> Writing your abstract…</div>}
                  {abstract && (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wide text-gray-500">Abstract</span>
                          <Button variant="subtle" onClick={copyAbstract}><Copy className="h-3.5 w-3.5" /> Copy</Button>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-300">{abstract.abstract}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {abstract.keywords.map((k) => <Badge key={k} tone="indigo">{k}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 p-4">
          <span className="text-xs text-gray-500">{savedProject ? 'Saved to your projects' : 'Saving…'}</span>
          <Button variant="ghost" onClick={onClose}><Bookmark className="h-4 w-4" /> Done</Button>
        </div>
      </motion.div>
    </div>
  );
}
