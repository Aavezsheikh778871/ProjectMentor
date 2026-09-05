/**
 * Prompt builders for the LLM path. Every JSON-mode prompt demands a single
 * raw JSON object, states exact key names, and includes a compact example -
 * that combination is what makes parsing reliable across providers.
 */
'use strict';

const JSON_ONLY = 'Return ONLY a single raw JSON object. No markdown code fences, no commentary before or after, no trailing text.';

function ideasPrompt(profile) {
  const { branch, skills, interests, difficulty, projectType, additionalRequirements } = profile;
  const system = 'You are an expert academic project advisor who helps final-year engineering students choose final-year projects that are innovative, practical, and realistically achievable in one semester.';
  const user = `Based on the following student profile:
- Branch: ${branch || 'Not specified'}
- Skills: ${(skills || []).join(', ') || 'Not specified'}
- Interests: ${(interests || []).join(', ') || 'Not specified'}
- Difficulty: ${difficulty || 'Intermediate'}
- Project Type: ${projectType || 'Not specified'}
- Additional Requirements: ${additionalRequirements || 'None'}

Generate 5 unique, innovative, and practical final-year project ideas.

For each idea provide:
1. title - catchy and descriptive
2. problemStatement - what real-world problem it solves
3. description - 2-3 sentences
4. domain - domain/category
5. innovationFactor - what makes it unique
6. feasibilityScore - integer 1-10, how feasible for a final year project
7. industryRelevanceScore - integer 1-10
8. suggestedTechStack - array of 4-6 technology name strings
9. difficultyLevel - one of "Beginner", "Intermediate", "Advanced"

${JSON_ONLY}
Shape: {"ideas": [{"title": "...", "problemStatement": "...", "description": "...", "domain": "...", "innovationFactor": "...", "feasibilityScore": 7, "industryRelevanceScore": 8, "suggestedTechStack": ["..."], "difficultyLevel": "Intermediate"}]}
The "ideas" array must contain exactly 5 items.`;
  return { system, user };
}

function planPrompt(projectTitle, projectDescription, userSkills) {
  const system = 'You are a senior software architect mentoring a final-year student team. Give concrete, actionable guidance, not generic advice.';
  const user = `Project: "${projectTitle}"
Description: ${projectDescription}
Student's known skills: ${(userSkills || []).join(', ') || 'Not specified'}

Produce a comprehensive project breakdown with:
- features: { mvp: [{title, description}], advanced: [{title, description}] } — at least 2 mvp and 1 advanced
- techStack: array of {layer, choice, justification} — at least 4 entries, justification must explain WHY
- developmentSteps: array of {phase, tasks: [string], duration} spanning roughly 12-16 weeks across 5-6 phases
- databaseDesign: { collections: [{name, fields: [string], notes}] }
- apiEndpoints: array of {method, path, purpose} — at least 5
- challenges: array of {challenge, solution} — at least 3 realistic technical challenges
- testingStrategy: array of strings
- deployment: {frontend, backend, database, steps: [string]}
- architectureSummary: one paragraph
- architectureDiagram: a Mermaid flowchart (flowchart LR) as a single string

${JSON_ONLY}
Shape: {"features":{"mvp":[{"title":"...","description":"..."}],"advanced":[{"title":"...","description":"..."}]},"techStack":[{"layer":"...","choice":"...","justification":"..."}],"developmentSteps":[{"phase":"...","tasks":["..."],"duration":"Week 1-2"}],"databaseDesign":{"collections":[{"name":"...","fields":["..."],"notes":"..."}]},"apiEndpoints":[{"method":"GET","path":"/api/...","purpose":"..."}],"challenges":[{"challenge":"...","solution":"..."}],"testingStrategy":["..."],"deployment":{"frontend":"...","backend":"...","database":"...","steps":["..."]},"architectureSummary":"...","architectureDiagram":"flowchart LR\\n  A-->B"}`;
  return { system, user };
}

function mentorPrompt(conversationHistory, currentQuestion, projectContext) {
  const system = 'You are an encouraging, technically sharp AI project mentor for a final-year student. Answer specifically and actionably. Use Markdown: headings, bullet lists, and fenced code blocks where a snippet genuinely helps. Ground every answer in the given project context. End with one short, relevant follow-up question.';
  const historyText = (conversationHistory || [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.content}`)
    .join('\n');
  const contextText = projectContext
    ? `Project: ${projectContext.title}\nDescription: ${projectContext.description}\nDomain: ${projectContext.domain || 'N/A'}\nTech stack: ${(projectContext.techStack || []).join(', ') || 'N/A'}`
    : 'No specific project is linked to this conversation yet.';
  const user = `${contextText}\n\nConversation so far:\n${historyText || '(no prior messages)'}\n\nStudent's new question: ${currentQuestion}`;
  return { system, user };
}

function improvementsPrompt(projectDetails, currentProgress) {
  const system = 'You are a technical mentor reviewing a student project for ways to strengthen it before submission.';
  const user = `Project: ${projectDetails?.title || 'Untitled'}
Description: ${projectDetails?.description || 'N/A'}
Current progress: ${currentProgress || 'Not specified'}

Suggest improvements across four categories:
- featureEnhancements: array of strings
- optimizations: array of strings
- scaling: array of strings
- differentiators: array of strings (what would make this stand out competitively)

Each array needs at least 3 concrete, specific suggestions grounded in this exact project - not generic advice.

${JSON_ONLY}
Shape: {"featureEnhancements":["..."],"optimizations":["..."],"scaling":["..."],"differentiators":["..."]}`;
  return { system, user };
}

function abstractPrompt(projectDetails) {
  const system = 'You write academic-register abstracts and synopsis outlines for final-year engineering project reports, suitable for direct university submission.';
  const user = `Project: ${projectDetails?.title || 'Untitled'}
Description: ${projectDetails?.description || 'N/A'}
Domain: ${projectDetails?.domain || 'N/A'}

Produce:
- abstract: a 150-250 word academic-style abstract (formal register, no first person, no marketing language)
- synopsisOutline: array of {section, points: [string]} covering the standard report chapters (Introduction, Literature Survey, Proposed System, Methodology, Results & Evaluation, Conclusion & Future Scope)
- keywords: array of 4-6 keyword strings

${JSON_ONLY}
Shape: {"abstract":"...","synopsisOutline":[{"section":"Introduction","points":["..."]}],"keywords":["..."]}`;
  return { system, user };
}

module.exports = { ideasPrompt, planPrompt, mentorPrompt, improvementsPrompt, abstractPrompt };
