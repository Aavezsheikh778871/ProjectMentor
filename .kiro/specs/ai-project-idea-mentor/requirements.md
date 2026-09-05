# Requirements Document

## Introduction

IdeaForge is a single-page web application that helps final-year students (a) generate scored, personalised project ideas from their interests, skills and constraints, and (b) turn a chosen idea into an actionable mentor blueprint covering features, technology stack, a week-by-week roadmap and concrete improvements.

The application produces complete output with **zero configuration** via a deterministic offline reasoning engine, and upgrades to richer LLM output when a provider credential exists. The offline path is the primary demo path: venue wifi, an expired free tier or a rate limit cannot break a presentation.

**Build budget: 2 hours.** Requirements 1-6 are REQUIRED and define a working, demoable product. Requirements 7-11 are OPTIONAL and are only started once every REQUIRED criterion passes.

### Given Infrastructure (out of scope for this spec)

Next.js 16, React 19, Tailwind CSS 4, TypeScript, zod and lucide-react are installed and configured. `src/lib/types.ts` already defines the full domain model (`StudentProfile`, `ProjectIdea`, `Blueprint`, `ChatMessage`, `EngineStatus`, `SavedProject`) and is the authoritative contract. `.env.example` already documents the provider variables.

## Glossary

- **IdeaForge_App**: The complete Next.js application.
- **Studio**: The single-page client UI at route `/`, comprising the intake, idea list and blueprint stages.
- **Intake_Form**: The Studio stage that captures a `StudentProfile`.
- **Knowledge_Base**: `src/lib/knowledge.ts` — domains, skill catalog, stack recipes/archetypes, dataset references and learning-resource URLs.
- **Offline_Engine**: `src/lib/engine.ts` — deterministic, network-free producer of `ProjectIdea` and `Blueprint` values.
- **LLM_Adapter**: The server-side module that calls the configured Gemini, OpenAI-compatible or Anthropic endpoint.
- **Provider_Router**: The server-side module that selects between LLM_Adapter and Offline_Engine and owns credential access.
- **Response_Validator**: The zod validation step applied to LLM_Adapter output.
- **Response_Repairer**: The step that merges Offline_Engine values into invalid or missing LLM fields.
- **Idea_API**: The route handler that returns `ProjectIdea` records.
- **Blueprint_API**: The route handler that returns one `Blueprint`.
- **Status_API**: The route handler that returns an `EngineStatus`.
- **Provider_Credential**: A non-empty `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` value.

---

# REQUIRED — the 2-hour core

## Requirement 1: Student Intake

**User Story:** As a final-year student, I want to describe my branch, interests, skills and constraints in one form, so that the ideas I receive fit my actual situation.

### Acceptance Criteria

1. THE Intake_Form SHALL collect every field of the `StudentProfile` interface: branch, interests, skills, skillLevel, teamSize, durationWeeks, budget, hasHardware, wantsResearchPaper, noveltyBias and constraints.
2. THE Intake_Form SHALL render interest options from the Knowledge_Base domain list and skill options from the Knowledge_Base skill catalog.
3. THE Intake_Form SHALL restrict teamSize to integers 1 through 6, durationWeeks to integers 1 through 52, and noveltyBias to integers 0 through 100.
4. THE Intake_Form SHALL prefill every field with a valid default value so that a student can submit the form in one action.
5. WHEN the student submits the Intake_Form with at least one interest and at least one skill selected, THE Studio SHALL send the assembled `StudentProfile` to the Idea_API.
6. IF the student submits the Intake_Form with zero interests or zero skills selected, THEN THE Intake_Form SHALL display a message naming the incomplete field and retain the entered values for correction.

## Requirement 2: Idea Generation

**User Story:** As a final-year student, I want a shortlist of scored ideas with a personal rationale, so that I can pick one with confidence instead of guessing.

### Acceptance Criteria

1. WHEN the Idea_API receives a valid `StudentProfile`, THE Idea_API SHALL return 5 `ProjectIdea` records that satisfy the `ProjectIdea` interface.
2. THE Idea_API SHALL set every score field (feasibility, novelty, impact, effort, skillMatch) to an integer from 0 through 100.
3. THE Idea_API SHALL return at least 3 records whose `domains` value contains at least one interest from the submitted `StudentProfile`.
4. THE Idea_API SHALL populate `whyForYou` with text naming at least one skill or interest from the submitted `StudentProfile`.
5. WHEN a higher `noveltyBias` value is submitted for an otherwise identical `StudentProfile`, THE Idea_API SHALL return a set of records whose mean novelty score is equal to or greater than the previous mean novelty score.
6. WHEN the Studio receives `ProjectIdea` records, THE Studio SHALL display for each record the title, tagline, difficulty, quickStack, all five scores and whyForYou.
7. WHILE an Idea_API request is in flight, THE Studio SHALL display a progress indicator and disable the generate control.
8. IF the Idea_API responds with an error status, THEN THE Studio SHALL display the error summary and a retry control.

## Requirement 3: Mentor Blueprint

**User Story:** As a final-year student, I want a chosen idea expanded into features, a stack, a schedule and improvement ideas, so that I can start building on Monday.

### Acceptance Criteria

1. WHEN the student selects one `ProjectIdea`, THE Studio SHALL send that record and the current `StudentProfile` to the Blueprint_API.
2. WHEN the Blueprint_API receives a valid `ProjectIdea` and `StudentProfile`, THE Blueprint_API SHALL return one `Blueprint` with every non-optional field of the `Blueprint` interface populated.
3. THE Blueprint_API SHALL return at least 2 features at tier `mvp`, at least 2 features at tier `core` and at least 1 feature at tier `stretch`, each with an `effortDays` integer of 1 or greater.
4. THE Blueprint_API SHALL return at least 4 `StackChoice` records, each carrying layer, choice, why, alternative and learningCurve values.
5. WHERE the submitted `StudentProfile` declares durationWeeks as N, THE Blueprint_API SHALL return roadmap phases whose week labels together span week 1 through week N, each phase carrying at least one goal and one deliverable.
6. THE Blueprint_API SHALL return combined `effortDays` for `mvp` and `core` features totalling at most teamSize × durationWeeks × 5 person-days.
7. THE Blueprint_API SHALL return at least 3 `noveltyBoosters` entries, each describing a concrete improvement to the selected idea.
8. WHEN the Studio receives a `Blueprint`, THE Studio SHALL display the features grouped by tier, the stack choices with justifications, the roadmap in ascending week order, and the noveltyBoosters list.
9. WHILE a Blueprint_API request is in flight, THE Studio SHALL display a progress indicator.
10. THE Studio SHALL provide a control that returns the student to the idea list with the previously generated records still displayed.

## Requirement 4: Zero-Configuration Offline Engine

**User Story:** As a student presenting at a hackathon, I want the platform to produce full output with no API key and no internet, so that the demo runs whatever the venue does.

### Acceptance Criteria

1. WHILE no Provider_Credential is configured, THE Provider_Router SHALL serve every Idea_API and Blueprint_API request from the Offline_Engine.
2. THE Offline_Engine SHALL return values satisfying the same `ProjectIdea` and `Blueprint` interfaces as the LLM_Adapter, with `source` set to `"engine"`.
3. WHEN the Offline_Engine receives two identical `StudentProfile` values, THE Offline_Engine SHALL return identical `ProjectIdea` arrays.
4. THE Offline_Engine SHALL complete one idea request and one blueprint request within 2 seconds each while performing zero outbound network calls.
5. THE Offline_Engine SHALL derive ideas, stack choices, dataset references and learning resources from the Knowledge_Base.
6. THE Knowledge_Base SHALL provide dataset references and learning resources as absolute `https` URLs.

## Requirement 5: LLM Path with Server-Side Credentials

**User Story:** As a student with a free API key, I want richer AI-authored output when a key exists, so that the platform reads as a genuine AI product without becoming fragile.

### Acceptance Criteria

1. WHILE at least one Provider_Credential is configured, THE Provider_Router SHALL serve Idea_API and Blueprint_API requests from the LLM_Adapter with `source` set to `"ai"`.
2. THE Provider_Router SHALL support Gemini, any OpenAI-compatible endpoint and Anthropic, selecting the provider named in `AI_PROVIDER` when that variable is non-empty and otherwise selecting by Provider_Credential detection.
3. THE Provider_Router SHALL read Provider_Credential values only inside server-side route handlers.
4. THE Status_API SHALL return provider, model, aiEnabled and label values, excluding all Provider_Credential values.
5. THE Studio SHALL display the Status_API label so the student can identify which engine produced the current output.
6. WHEN the LLM_Adapter returns a response, THE Response_Validator SHALL validate that response against the zod schema for the requested type.
7. IF a validated LLM_Adapter response contains missing or invalid fields, THEN THE Response_Repairer SHALL populate those fields from the Offline_Engine result and return a schema-valid payload.
8. IF the LLM_Adapter request raises an error or exceeds 30 seconds, THEN THE Provider_Router SHALL return the Offline_Engine payload with `source` set to `"engine"`.

## Requirement 6: Single-Page Delivery

**User Story:** As a judge watching a 3-minute demo, I want the whole journey on one page, so that the value is visible without navigation or sign-up.

### Acceptance Criteria

1. THE Studio SHALL present the intake, idea list and blueprint stages within route `/`.
2. THE Studio SHALL serve every route to anonymous visitors without an authentication step.
3. THE IdeaForge_App SHALL hold student data in browser memory and server request scope only, using no server-side datastore.
4. THE Studio SHALL render a usable layout at viewport widths from 360 through 1920 CSS pixels.
5. THE Studio SHALL apply a contrast ratio of at least 4.5:1 between body text and its background, and SHALL expose every interactive control to keyboard focus.

---

# OPTIONAL — only if the clock allows

Each optional requirement is independently shippable. Implement in the listed order and stop when time runs out.

## Requirement 7 (OPTIONAL): Mentor Follow-Up Chat

**User Story:** As a student, I want to ask follow-up questions about my chosen idea, so that I can resolve doubts without restarting.

### Acceptance Criteria

1. WHERE the mentor chat is enabled, THE Studio SHALL display a message thread of `ChatMessage` values scoped to the selected `ProjectIdea`.
2. WHERE the mentor chat is enabled, WHEN the student submits a question, THE Provider_Router SHALL return an assistant `ChatMessage` grounded in the selected `ProjectIdea` and its `Blueprint`.
3. WHERE the mentor chat is enabled AND no Provider_Credential is configured, THE Offline_Engine SHALL return an assistant `ChatMessage` composed from the current `Blueprint` and the Knowledge_Base.

## Requirement 8 (OPTIONAL): Saved Idea Library

**User Story:** As a student, I want to pin ideas, so that a page reload does not lose my shortlist.

### Acceptance Criteria

1. WHERE the library is enabled, WHEN the student saves a `ProjectIdea`, THE Studio SHALL persist a `SavedProject` value to browser localStorage.
2. WHERE the library is enabled, WHEN the Studio loads, THE Studio SHALL list every stored `SavedProject` in descending `savedAt` order.
3. WHERE the library is enabled, WHEN the student removes a stored entry, THE Studio SHALL delete that entry from localStorage and from the displayed list.
4. WHERE the library is enabled, IF stored localStorage content fails schema validation, THEN THE Studio SHALL discard the invalid entry and render the remaining valid entries.

## Requirement 9 (OPTIONAL): Markdown and Print Export

**User Story:** As a student, I want to export the synopsis and blueprint, so that the output drops straight into my report.

### Acceptance Criteria

1. WHERE export is enabled, WHEN the student requests a Markdown export, THE Studio SHALL produce a Markdown document containing the abstract, objectives, features, stack, roadmap and noveltyBoosters.
2. WHERE export is enabled, WHEN the student requests a print view, THE Studio SHALL render the `Blueprint` in a print stylesheet that omits navigation and interactive controls.

## Requirement 10 (OPTIONAL): Viva Prep and Research-Paper Angle

**User Story:** As a student facing a viva, I want likely questions and a publication angle, so that I can defend the project.

### Acceptance Criteria

1. WHERE viva prep is enabled, THE Studio SHALL display every `vivaQA` entry of the current `Blueprint` as a question and answer pair.
2. WHERE viva prep is enabled AND the `StudentProfile` sets wantsResearchPaper to true, THE Blueprint_API SHALL populate `paperAngle` with venueType, contribution and at least 2 relatedWork entries.
3. WHERE viva prep is enabled, THE Studio SHALL display the `reportOutline` chapters of the current `Blueprint`.

## Requirement 11 (OPTIONAL): Idea Comparison View

**User Story:** As a student weighing options, I want ideas side by side, so that I can choose on evidence.

### Acceptance Criteria

1. WHERE comparison is enabled, WHEN the student selects 2 or 3 `ProjectIdea` records, THE Studio SHALL display those records in a table of the five score fields plus difficulty and quickStack.
2. WHERE comparison is enabled, THE Studio SHALL mark the highest value in each score column.
3. WHERE comparison is enabled, WHEN the student confirms one record from the comparison table, THE Studio SHALL request the `Blueprint` for that record.
