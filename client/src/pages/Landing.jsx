import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lightbulb, Map, Bot, Sparkles, ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  { icon: Lightbulb, title: 'Smart Idea Generation', body: 'Get 5 scored, personalised final-year project ideas matched to your skills, interests and timeline.' },
  { icon: Map, title: 'Detailed Project Roadmaps', body: 'Turn any idea into features, a tech stack with justifications, and a week-by-week development plan.' },
  { icon: Bot, title: 'AI Mentor Chat', body: 'Ask follow-up questions and get specific, actionable guidance grounded in your chosen project.' },
];

const steps = [
  { n: '1', title: 'Tell us about you', body: 'Your branch, skills, interests and how much time you have.' },
  { n: '2', title: 'Generate & compare', body: 'Browse scored ideas and pick the one that fits.' },
  { n: '3', title: 'Build with a mentor', body: 'Get a roadmap and an AI mentor to guide you to the finish.' },
];

export default function Landing() {
  const { isAuthed } = useAuth();
  const startHref = isAuthed ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold text-white">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          ProjectMentor AI
        </div>
        <nav className="flex items-center gap-2">
          {isAuthed ? (
            <Button as={Link} to="/dashboard">Dashboard</Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">Log in</Button>
              <Button as={Link} to="/register">Get started</Button>
            </>
          )}
        </nav>
      </header>

      <section className="aurora relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" /> Built for final-year students
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-6xl">
              Your AI-Powered Final Year Project Mentor
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-gray-300">
              Generate innovative project ideas, get detailed roadmaps, and receive expert AI guidance — all tailored to YOUR skills.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button as={Link} to={startHref} className="px-6 py-3 text-base">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button as={Link} to={isAuthed ? '/generate' : '/login'} variant="ghost" className="px-6 py-3 text-base">
                Explore Ideas
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15">
                <f.icon className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-white">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 font-bold text-white">
                {s.n}
              </div>
              <h3 className="mb-1.5 font-semibold text-white">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center sm:grid-cols-3">
          {[
            ['5', 'Scored ideas per search'],
            ['12+', 'Problem domains covered'],
            ['0', 'API keys required to try it'],
          ].map(([stat, label]) => (
            <div key={label}>
              <div className="text-4xl font-bold text-white">{stat}</div>
              <div className="mt-1 text-sm text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        ProjectMentor AI — an AI project idea generator & mentor for final-year students.
      </footer>
    </div>
  );
}
