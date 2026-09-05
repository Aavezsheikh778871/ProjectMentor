import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Card, Field, Input, Select, Chip, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DOMAIN_OPTIONS, SKILL_OPTIONS, YEAR_OPTIONS } from '../lib/constants.js';

const STEPS = ['Account', 'College', 'Skills', 'Interests'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    college: '', branch: '', year: '4',
    skills: [], interests: [],
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, value) =>
    set({ [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value] });

  const validateStep = () => {
    if (step === 0) {
      if (form.name.trim().length < 2) return 'Please enter your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email.';
      if (form.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (step === 2 && form.skills.length === 0) return 'Pick at least one skill.';
    if (step === 3 && form.interests.length === 0) return 'Pick at least one interest.';
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aurora flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-lg p-8">
        <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-white">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          ProjectMentor AI
        </Link>

        {/* Progress indicator */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>
        <p className="mb-5 text-sm font-medium text-indigo-300">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full name" htmlFor="name">
              <Input id="name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Aarav Sharma" />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@college.edu" />
            </Field>
            <Field label="Password" htmlFor="password" hint="At least 8 characters.">
              <Input id="password" type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder="••••••••" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="College" htmlFor="college">
              <Input id="college" value={form.college} onChange={(e) => set({ college: e.target.value })} placeholder="Parul University" />
            </Field>
            <Field label="Branch" htmlFor="branch">
              <Input id="branch" value={form.branch} onChange={(e) => set({ branch: e.target.value })} placeholder="CSE / IT / ECE…" />
            </Field>
            <Field label="Year" htmlFor="year">
              <Select id="year" value={form.year} onChange={(e) => set({ year: e.target.value })}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-gray-400">Select the technologies you already know.</p>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => (
                <Chip key={s} active={form.skills.includes(s)} onClick={() => toggle('skills', s)}>{s}</Chip>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm text-gray-400">Which domains excite you?</p>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((d) => (
                <Chip key={d} active={form.interests.includes(d)} onClick={() => toggle('interests', d)}>{d}</Chip>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="subtle" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : <>Create account <Check className="h-4 w-4" /></>}
            </Button>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-300 hover:text-indigo-200">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
