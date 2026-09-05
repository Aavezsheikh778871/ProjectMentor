/**
 * Deterministic offline reasoning engine. Produces the exact same output
 * shapes as the LLM path (see aiService.js) with zero network calls, so the
 * platform works end-to-end with no API key. Same input -> same output,
 * via a seeded PRNG, which also makes results reproducible for grading.
 */
'use strict';

const { ARCHETYPES, SEEDS, RESOURCES, archetypeForSkills } = require('./knowledge');

/* ------------------------------ Seeded PRNG ------------------------------ */

/** djb2 string hash -> 32-bit seed. */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, good-enough PRNG for deterministic content generation. */
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFrom(seedStr) {
  return mulberry32(hashString(seedStr));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function pickN(rng, arr, n) {
  const pool = [...arr];
  const out = [];
  while (pool.length && out.length < n) {
    const idx = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** Stable normalisation so equivalent profiles hash to the same seed. */
function normProfile(profile) {
  const skills = [...new Set((profile.skills || []).map((s) => String(s).trim()))].sort((a, b) =>
    a.localeCompare(b)
  );
  const interests = [...new Set((profile.interests || []).map((s) => String(s).trim()))].sort((a, b) =>
    a.localeCompare(b)
  );
  return {
    branch: String(profile.branch || '').trim(),
    skills,
    interests,
    difficulty: profile.difficulty || 'Intermediate',
    projectType: profile.projectType || '',
    additionalRequirements: String(profile.additionalRequirements || '').trim(),
  };
}

/* ------------------------------ Scoring ------------------------------ */

/**
 * feasibilityScore (1-10): starts high, penalised by archetype difficulty
 * weight (1-5) and rewarded by skill overlap with the archetype, and by
 * an easier declared difficulty level.
 */
function feasibilityScore(archetype, skills, difficulty, rng) {
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));
  const overlap = archetype.skills.reduce((n, s) => n + (skillSet.has(s.toLowerCase()) ? 1 : 0), 0);
  const overlapBonus = Math.min(3, overlap); // up to +3
  const weightPenalty = archetype.weight - 1; // 0..4
  const difficultyBonus = difficulty === 'Beginner' ? 1 : difficulty === 'Advanced' ? -1 : 0;
  const base = 9 - weightPenalty + overlapBonus * 0.5 + difficultyBonus;
  const jitter = (rng() - 0.5) * 1.2; // small variation so ideas in a set aren't identical
  return clampInt(base + jitter, 1, 10);
}

/** industryRelevanceScore (1-10): domain/angle driven, with mild seeded variation. */
function industryRelevanceScore(seedIndex, rng) {
  // Later seeds within a domain skew slightly higher (curated to be the
  // "sharper" angle) — combined with jitter so it never feels mechanical.
  const base = 7 + seedIndex * 0.3;
  const jitter = (rng() - 0.5) * 2.2;
  return clampInt(base + jitter, 1, 10);
}

/* ------------------------------ Ideas ------------------------------ */

const TITLE_PREFIXES = ['Smart', 'AI-Powered', 'Intelli', 'Auto', 'Next-Gen', 'Adaptive'];

function titleFor(seed, domainLabel, rng) {
  const prefix = pick(rng, TITLE_PREFIXES);
  const core = seed.angle
    .split(' ')
    .slice(0, 4)
    .join(' ')
    .replace(/[,.]$/, '');
  return `${prefix} ${core}`.replace(/\s+/g, ' ').trim();
}

function domainLabelOf(domainKey, domains) {
  const found = (domains || []).find((d) => d.key === domainKey);
  return found ? found.label : domainKey;
}

/**
 * Generate exactly 5 ideas for a normalised profile. Deterministic: the
 * same profile always yields the same 5 ideas in the same order.
 */
function ideas(profileInput) {
  const { DOMAINS } = require('./knowledge');
  const profile = normProfile(profileInput);
  const interestPool = profile.interests.length ? profile.interests : Object.keys(SEEDS);
  const rng = rngFrom(`ideas:${JSON.stringify(profile)}`);

  // Build a flat candidate list: one entry per (domain, seed).
  const candidates = [];
  interestPool.forEach((domainKey) => {
    const seedsForDomain = SEEDS[domainKey] || SEEDS[Object.keys(SEEDS)[0]];
    seedsForDomain.forEach((seed, idx) => candidates.push({ domainKey, seed, idx }));
  });
  // Always have enough candidates even for a single, narrow interest.
  if (candidates.length < 5) {
    Object.keys(SEEDS).forEach((domainKey) => {
      if (interestPool.includes(domainKey)) return;
      SEEDS[domainKey].forEach((seed, idx) => candidates.push({ domainKey, seed, idx }));
    });
  }

  const chosen = pickN(rng, candidates, 5);

  const out = chosen.map(({ domainKey, seed, idx }) => {
    const archetypeKey = archetypeForSkills(profile.skills, seed.techFocus);
    const archetype = ARCHETYPES[archetypeKey];
    const domainLabel = domainLabelOf(domainKey, DOMAINS);
    const itemRng = rngFrom(`idea:${domainKey}:${idx}:${JSON.stringify(profile)}`);

    const feasibility = feasibilityScore(archetype, profile.skills, profile.difficulty, itemRng);
    const relevance = industryRelevanceScore(idx, itemRng);

    return {
      title: titleFor(seed, domainLabel, itemRng),
      problemStatement: seed.problem,
      description: `A ${archetype.label.toLowerCase()} that helps ${seed.users.join(' and ')} by ${seed.angle.toLowerCase()}. Built around ${archetype.techStack[0].choice} and designed to ship a working demo within a semester.`,
      domain: domainLabel,
      innovationFactor: `Combines ${seed.angle.toLowerCase()} with a practical focus on ${seed.users[0]}, going beyond a textbook tutorial by targeting a real, underserved workflow.`,
      feasibilityScore: feasibility,
      industryRelevanceScore: relevance,
      suggestedTechStack: archetype.techStack.map((t) => t.choice),
      difficultyLevel: profile.difficulty,
      _archetypeKey: archetypeKey, // internal, stripped by aiService before responding
      _datasetHint: seed.datasetHint,
    };
  });

  return out;
}

/* ------------------------------ Detailed plan ------------------------------ */

const PHASE_TEMPLATES = [
  { title: 'Research & Requirements', tasks: ['Finalise problem scope and success metrics', 'Survey existing solutions and datasets', 'Write the requirements doc and get guide sign-off'] },
  { title: 'Design & Setup', tasks: ['Design the data model and system architecture', 'Set up repos, CI, and the base project skeleton', 'Design key screens/API contracts'] },
  { title: 'Core Build', tasks: ['Implement the core domain logic end-to-end', 'Build the primary user-facing flow', 'Wire up the database and core API endpoints'] },
  { title: 'Intelligence Layer', tasks: ['Build/train the model or rules engine at the heart of the project', 'Integrate it behind a clean API boundary', 'Validate output quality against sample cases'] },
  { title: 'Integration & Polish', tasks: ['Connect frontend to the complete backend', 'Handle edge cases and error states', 'Improve UI/UX based on a test users\u2019 feedback'] },
  { title: 'Testing & Submission', tasks: ['Write and run the test suite', 'Fix bugs found during testing', 'Prepare the report, abstract, and demo script'] },
];

/**
 * Split a `durationWeeks`-length timeline into phases covering weeks 1..N
 * with no gaps, no overlap, and no phase ever starting after it ends -
 * safe for any duration from a couple of weeks up to a full year.
 */
function buildRoadmapWeeks(durationWeeks) {
  const weeks = Math.max(2, Math.round(durationWeeks) || 14);
  // Never use more phases than there are weeks to fill.
  const phaseCount = Math.max(1, Math.min(weeks >= 10 ? 6 : 5, weeks, PHASE_TEMPLATES.length));
  const templates = PHASE_TEMPLATES.slice(0, phaseCount);

  // Distribute `weeks` whole weeks across `phaseCount` phases as evenly as
  // possible: every phase gets at least floor(weeks/phaseCount), and the
  // first `remainder` phases get one extra week. This always sums to
  // exactly `weeks` with strictly increasing, non-overlapping ranges.
  const base = Math.floor(weeks / phaseCount);
  const remainder = weeks % phaseCount;

  let cursor = 1;
  return templates.map((tpl, i) => {
    const length = base + (i < remainder ? 1 : 0);
    const start = cursor;
    const end = start + length - 1;
    cursor = end + 1;
    return {
      phase: tpl.title,
      tasks: tpl.tasks,
      duration: start === end ? `Week ${start}` : `Week ${start}-${end}`,
    };
  });
}

function planFeatures(archetype) {
  const mvp = archetype.modules.slice(0, Math.ceil(archetype.modules.length / 2)).map((m) => ({
    title: m,
    description: `Core implementation of ${m.toLowerCase()} — required for a working end-to-end demo.`,
  }));
  const advanced = archetype.modules.slice(Math.ceil(archetype.modules.length / 2)).map((m) => ({
    title: m,
    description: `Enhances the MVP with ${m.toLowerCase()}, adding depth once the core flow works.`,
  }));
  // Guarantee at least one advanced feature even for short module lists.
  if (advanced.length === 0) {
    advanced.push({ title: 'Analytics dashboard', description: 'Surface usage/quality metrics once the core flow is stable.' });
  }
  return { mvp, advanced };
}

function architectureDiagram(archetype) {
  const nodes = archetype.modules;
  const lines = ['flowchart LR'];
  nodes.forEach((n, i) => {
    const id = `M${i}`;
    lines.push(`  ${id}["${n}"]`);
  });
  for (let i = 0; i < nodes.length - 1; i += 1) {
    lines.push(`  M${i} --> M${i + 1}`);
  }
  return lines.join('\n');
}

/**
 * Build the full detailed plan for a project title/description. `userSkills`
 * biases the archetype (and therefore the stack/steps/challenges) toward
 * what the student already knows.
 */
function plan(projectTitle, projectDescription, userSkills = [], durationWeeksHint) {
  const archetypeKey = archetypeForSkills(userSkills, undefined);
  const archetype = ARCHETYPES[archetypeKey];
  const { mvp, advanced } = planFeatures(archetype);

  return {
    features: { mvp, advanced },
    techStack: archetype.techStack,
    developmentSteps: buildRoadmapWeeks(durationWeeksHint || 14),
    databaseDesign: { collections: archetype.collections },
    apiEndpoints: archetype.apiEndpoints,
    challenges: archetype.challenges,
    testingStrategy: archetype.testingStrategy,
    deployment: archetype.deployment,
    architectureSummary: `${projectTitle} follows a ${archetype.label.toLowerCase()} architecture: ${archetype.modules.join(' -> ')}. Each module has a single responsibility, so the pipeline can be tested and demoed stage by stage.`,
    architectureDiagram: architectureDiagram(archetype),
  };
}

/* ------------------------------ Mentor chat ------------------------------ */

const INTENT_KEYWORDS = {
  architecture: ['architecture', 'system design', 'structure', 'modules', 'diagram'],
  stack: ['tech stack', 'which technology', 'which framework', 'what stack', 'technolog'],
  auth: ['authentication', 'auth', 'login', 'jwt', 'signup', 'sign up'],
  database: ['database', 'schema', 'mongo', 'sql', 'model design', 'collection'],
  timeline: ['timeline', 'plan', 'weeks', 'schedule', 'roadmap', 'deadline'],
  testing: ['test', 'testing', 'qa', 'bug'],
  deploy: ['deploy', 'hosting', 'production', 'render', 'vercel'],
  dataset: ['dataset', 'data source', 'training data'],
  improve: ['improve', 'better', 'enhance', 'differentiat', 'stand out'],
  stuck: ['stuck', 'help', 'confused', "don't know", 'dont know', 'no idea'],
};

function detectIntent(question) {
  const q = question.toLowerCase();
  for (const [intent, words] of Object.entries(INTENT_KEYWORDS)) {
    if (words.some((w) => q.includes(w))) return intent;
  }
  return 'general';
}

function contextArchetype(projectContext) {
  const skills = projectContext?.techStack || [];
  const key = archetypeForSkills(skills, undefined);
  return ARCHETYPES[key];
}

function mentorReply(conversationHistory, currentQuestion, projectContext) {
  const intent = detectIntent(currentQuestion || '');
  const arch = contextArchetype(projectContext);
  const projectName = projectContext?.title ? `**${projectContext.title}**` : 'your project';
  const lines = [];

  switch (intent) {
    case 'architecture':
      lines.push(`Here's a sensible architecture for ${projectName}:`);
      lines.push('');
      arch.modules.forEach((m, i) => lines.push(`${i + 1}. **${m}**`));
      lines.push('');
      lines.push(`Keep each module behind a clear interface so you can test and demo it in isolation before wiring the next one in.`);
      break;
    case 'stack':
      lines.push(`For ${projectName}, here's what I'd recommend and why:`);
      lines.push('');
      arch.techStack.forEach((t) => lines.push(`- **${t.layer}: ${t.choice}** — ${t.justification}`));
      break;
    case 'auth':
      lines.push(`For authentication on ${projectName}, use JWT-based auth:`);
      lines.push('');
      lines.push('```javascript');
      lines.push("// on login, after verifying the password with bcrypt.compare:");
      lines.push("const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });");
      lines.push('```');
      lines.push('');
      lines.push('Store the token client-side (memory or httpOnly cookie, avoid plain localStorage if you can), and send it as `Authorization: Bearer <token>` on protected requests. Hash passwords with bcrypt before saving, never store plaintext.');
      break;
    case 'database':
      lines.push(`Here's a starting schema for ${projectName}:`);
      lines.push('');
      arch.collections.forEach((c) => lines.push(`- **${c.name}**: ${c.fields.join(', ')} — ${c.notes}`));
      break;
    case 'timeline':
      lines.push(`A realistic breakdown for ${projectName}:`);
      lines.push('');
      buildRoadmapWeeks(14).forEach((p) => lines.push(`- **${p.duration} — ${p.phase}**: ${p.tasks[0]}`));
      break;
    case 'testing':
      lines.push(`For testing ${projectName}, I'd cover:`);
      lines.push('');
      arch.testingStrategy.forEach((t) => lines.push(`- ${t}`));
      break;
    case 'deploy':
      lines.push(`For deployment, ${projectName} maps well to:`);
      lines.push('');
      lines.push(`- Frontend: ${arch.deployment.frontend}`);
      lines.push(`- Backend: ${arch.deployment.backend}`);
      lines.push(`- Database: ${arch.deployment.database}`);
      lines.push('');
      arch.deployment.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      break;
    case 'dataset':
      lines.push(`For data, look at sources close to your actual users first (self-collected beats generic public data for a convincing demo), then fall back to public datasets for pretraining/benchmarking.`);
      break;
    case 'improve':
      lines.push(`A few ways to push ${projectName} beyond a baseline submission:`);
      lines.push('');
      lines.push('- Add an explainability layer (why did the system decide this?) — reviewers respond well to this');
      lines.push('- Benchmark against a naive baseline so your results section has a comparison, not just a number');
      lines.push('- Ship one polished end-to-end flow rather than five half-finished features');
      break;
    case 'stuck':
      lines.push(`Let's unblock this. The fastest way through "stuck" is narrowing scope: pick the single smallest slice of ${projectName} that produces a visible result end-to-end, ship that, then expand outward.`);
      lines.push('');
      lines.push(`What specifically is blocking you right now — is it a design decision, a bug, or not knowing where to start?`);
      break;
    default:
      lines.push(`On ${projectName}: ${currentQuestion ? 'good question.' : "let's dig in."} The core architecture is ${arch.label.toLowerCase()}, built on ${arch.techStack[0].choice}. Tell me if you want the tech stack, database design, timeline, testing plan, or deployment steps and I'll go deep on that.`);
  }

  lines.push('');
  const followUps = {
    architecture: 'Want me to expand any single module into concrete API endpoints?',
    stack: 'Want the reasoning behind any specific layer, or an alternative if you already know something else?',
    auth: 'Want the corresponding Express middleware that verifies this token?',
    database: 'Want me to turn one of these into a full Mongoose schema?',
    timeline: 'Want this broken down week-by-week instead of by phase?',
    testing: 'Want a starter test file for the riskiest module?',
    deploy: 'Want the exact environment variables you\'ll need to set?',
    dataset: 'Want a specific dataset recommendation for your domain?',
    improve: 'Want me to pick the one improvement most likely to impress judges specifically?',
    stuck: 'Tell me what you\'ve tried so far and I\'ll suggest the next concrete step.',
    general: 'What would help most right now?',
  };
  lines.push(`_${followUps[intent] || followUps.general}_`);

  return lines.join('\n');
}

/* ------------------------------ Improvements ------------------------------ */

function improvements(projectDetails, currentProgress) {
  const arch = contextArchetype(projectDetails);
  const title = projectDetails?.title || 'this project';
  return {
    featureEnhancements: [
      `Add a "why this result" explanation panel so users trust ${title}'s output instead of treating it as a black box.`,
      'Add a notification/reminder flow so users come back instead of using the tool once and forgetting it.',
      'Support exporting results (PDF/CSV) since evaluators and real users both want to take data with them.',
    ],
    optimizations: [
      'Cache expensive computations (model inference, aggregation queries) for repeated identical inputs.',
      'Add pagination and indexes on any list endpoint before the dataset grows past a few hundred records.',
      'Move any long-running work (training, batch processing) off the request thread into a background job.',
    ],
    scaling: [
      `Split ${arch.modules[0].toLowerCase()} into its own service once traffic or team size grows, so it can be deployed and scaled independently.`,
      'Introduce a queue (even a simple one) between ingestion and processing so spikes do not drop requests.',
      'Add basic monitoring (error rate, latency) before scaling — you cannot improve what you cannot see.',
    ],
    differentiators: [
      `Benchmark ${title} against the closest existing tool and publish the comparison — this is the single most convincing thing in a viva.`,
      `Progress so far ("${currentProgress || 'in progress'}") suggests focusing next on whichever module is least finished — partial breadth scores worse than finished depth.`,
      'Add one genuinely novel angle beyond the core build (e.g. an explainability view, an accessibility mode, or an offline mode) as the "what makes this different" story.',
    ],
  };
}

/* ------------------------------ Abstract ------------------------------ */

function abstract(projectDetails) {
  const title = projectDetails?.title || 'This project';
  const domain = projectDetails?.domain || 'the target domain';
  const description = projectDetails?.description || 'addresses a practical, underserved problem';

  const text = `${title} is a ${domain.toLowerCase()} solution that ${description.replace(/^[A-Z]/, (c) => c.toLowerCase())} Final-year student projects in this space frequently stop at a proof of concept; this work is scoped to deliver a complete, demonstrable system covering data handling, core logic, and a usable interface within a single semester. The system is evaluated against clearly defined success metrics rather than subjective impressions, and the design explicitly separates concerns so individual components can be tested, replaced, or extended independently. Beyond the immediate academic deliverable, the approach generalises to related problems in ${domain.toLowerCase()}, making the contribution reusable rather than single-purpose. The result is a project that is feasible within a limited timeline, grounded in a real problem statement, and structured to support both a strong technical evaluation and a clear viva defence.`;

  return {
    abstract: text,
    synopsisOutline: [
      { section: 'Introduction', points: ['Problem context and motivation', 'Who is affected and how today', 'Objective of the project'] },
      { section: 'Literature Survey', points: ['Existing approaches and their limitations', 'Gap this project addresses'] },
      { section: 'Proposed System', points: ['High-level architecture', 'Key modules and responsibilities', 'What is novel versus existing work'] },
      { section: 'Methodology', points: ['Data/requirements gathering', 'Design and implementation approach', 'Tools and technologies used'] },
      { section: 'Results & Evaluation', points: ['Metrics used to judge success', 'Results against those metrics', 'Comparison to a baseline or existing tool'] },
      { section: 'Conclusion & Future Scope', points: ['Summary of what was achieved', 'Limitations', 'Concrete directions for future work'] },
    ],
    keywords: [domain, title.split(' ').slice(0, 2).join(' '), 'Final-Year Project', 'Applied AI', 'Software Engineering'],
  };
}

module.exports = {
  ideas,
  plan,
  mentorReply,
  improvements,
  abstract,
  RESOURCES,
};
