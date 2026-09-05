import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles, Bookmark, Eye } from 'lucide-react';
import { Card, Button, Chip, Field, Select, Textarea, ScoreDots, Badge, Skeleton, EmptyState } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../lib/api.js';
import { DOMAIN_OPTIONS, SKILL_OPTIONS, DIFFICULTY_OPTIONS, PROJECT_TYPES } from '../lib/constants.js';
import IdeaDetailModal from '../components/IdeaDetailModal.jsx';

export default function Generate() {
  const { user } = useAuth();
  const [skills, setSkills] = useState(user?.skills?.length ? user.skills : ['React', 'Node.js']);
  const [interests, setInterests] = useState(user?.interests?.length ? user.interests : ['HealthTech']);
  const [difficulty, setDifficulty] = useState(user?.preferences?.difficulty || 'Intermediate');
  const [projectType, setProjectType] = useState('Any');
  const [extra, setExtra] = useState('');

  const [ideas, setIdeas] = useState(null);
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [detail, setDetail] = useState(null); // the idea being viewed in the modal

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const generate = async () => {
    if (skills.length === 0 && interests.length === 0) {
      return toast.error('Pick at least one skill or interest.');
    }
    setBusy(true);
    setIdeas(null);
    try {
      const data = await projectApi.generate({
        skills, interests, difficulty,
        projectType: projectType === 'Any' ? '' : projectType,
        additionalRequirements: extra,
      });
      setIdeas(data.ideas);
      setSource(data.source);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveIdea = async (idea) => {
    setSavingId(idea.title);
    try {
      const data = await projectApi.save({
        title: idea.title,
        description: idea.description,
        problemStatement: idea.problemStatement,
        domain: idea.domain,
        difficultyLevel: idea.difficultyLevel,
        suggestedTechStack: idea.suggestedTechStack,
        innovationFactor: idea.innovationFactor,
        feasibilityScore: idea.feasibilityScore,
        industryRelevanceScore: idea.industryRelevanceScore,
        source: source || 'fallback',
      });
      toast.success('Saved to your projects');
      return data.project;
    } catch (e) {
      toast.error(e.message);
      return null;
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Generate Project Ideas</h1>
        <p className="mt-1 text-gray-400">Tune the inputs, then let the mentor propose five scored ideas.</p>
      </div>

      {/* Input form */}
      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium text-gray-300">Skills</div>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => (
                <Chip key={s} active={skills.includes(s)} onClick={() => toggle(skills, setSkills, s)}>{s}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-gray-300">Interests / Domains</div>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((d) => (
                <Chip key={d} active={interests.includes(d)} onClick={() => toggle(interests, setInterests, d)}>{d}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty" htmlFor="difficulty">
            <Select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Project type" htmlFor="ptype">
            <Select id="ptype" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              {PROJECT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Additional requirements (optional)" htmlFor="extra">
            <Textarea id="extra" rows={2} value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="e.g. must use no paid APIs, guide prefers an ML component, team of 2…" />
          </Field>
        </div>

        <div className="mt-5">
          <Button onClick={generate} disabled={busy} className="px-6">
            {busy ? 'Generating…' : <>Generate Ideas <Sparkles className="h-4 w-4" /></>}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {busy && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      )}

      {!busy && ideas && ideas.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Your Ideas</h2>
            <Badge tone={source === 'ai' ? 'emerald' : 'gray'}>
              {source === 'ai' ? 'AI-generated' : 'Offline engine'}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {ideas.map((idea, i) => (
              <motion.div key={idea.title + i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="flex h-full flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-indigo-200">{idea.title}</h3>
                    <Badge tone="gray">{idea.difficultyLevel}</Badge>
                  </div>
                  <Badge tone="indigo">{idea.domain}</Badge>
                  <p className="mt-3 text-sm text-gray-400"><span className="font-medium text-gray-300">Problem: </span>{idea.problemStatement}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-400">{idea.description}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ScoreDots label="Feasibility" value={idea.feasibilityScore} />
                    <ScoreDots label="Industry relevance" value={idea.industryRelevanceScore} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {idea.suggestedTechStack.slice(0, 4).map((t) => <Badge key={t} tone="gray">{t}</Badge>)}
                  </div>

                  <div className="mt-4 flex gap-2 pt-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setDetail({ idea })}>
                      <Eye className="h-4 w-4" /> View details
                    </Button>
                    <Button className="flex-1" disabled={savingId === idea.title} onClick={() => saveIdea(idea)}>
                      <Bookmark className="h-4 w-4" /> {savingId === idea.title ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!busy && ideas && ideas.length === 0 && (
        <EmptyState icon={Sparkles} title="No ideas yet" description="Try widening your skills or interests." />
      )}

      {detail && (
        <IdeaDetailModal
          idea={detail.idea}
          source={source}
          onClose={() => setDetail(null)}
          onSave={saveIdea}
        />
      )}
    </div>
  );
}
