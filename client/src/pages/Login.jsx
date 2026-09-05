import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap } from 'lucide-react';
import { Button, Card, Field, Input, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aurora flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md p-8">
        <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-white">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          ProjectMentor AI
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-white">Log in</h1>
        <p className="mb-6 text-sm text-gray-400">Pick up where you left off.</p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@college.edu" />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" type="password" required autoComplete="current-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner className="h-4 w-4" /> : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-300 hover:text-indigo-200">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
