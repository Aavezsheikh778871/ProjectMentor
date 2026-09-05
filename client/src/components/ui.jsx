/**
 * Small shared UI primitives. Kept in one file to keep the component count
 * low. All colours chosen to clear 4.5:1 contrast on the dark background.
 */
import { Loader2 } from 'lucide-react';

export function Button({ as: As = 'button', variant = 'primary', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20',
    ghost: 'bg-white/5 text-gray-200 hover:bg-white/10 border border-white/10',
    subtle: 'bg-transparent text-indigo-300 hover:text-indigo-200',
    danger: 'bg-red-500/90 text-white hover:bg-red-500',
  };
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition border ${
        active
          ? 'bg-indigo-500/90 text-white border-indigo-400'
          : 'bg-white/5 text-gray-300 border-white/10 hover:border-indigo-400/50'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
      {...props}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
      {...props}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
      {...props}
    >
      {children}
    </select>
  );
}

/** 0-100 horizontal score meter with a label. */
export function ScoreBar({ label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    fuchsia: 'bg-fuchsia-400',
  };
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums text-gray-300">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

/** Score out of 10, shown as filled dots (used for feasibility/relevance). */
export function ScoreDots({ label, value, max = 10 }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums text-gray-300">{value}/{max}</span>
      </div>
      <div className="flex gap-1" aria-label={`${label}: ${value} out of ${max}`}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < value ? 'bg-indigo-400' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    gray: 'bg-white/5 text-gray-300 border-white/10',
  };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-400" role="status" aria-live="polite">
      <Spinner className="h-8 w-8 text-indigo-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-gray-600" aria-hidden="true" />}
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action}
    </div>
  );
}
