/**
 * Knowledge base powering the offline fallback engine (and used as
 * grounding context in LLM prompts). This is the "brain" that lets the
 * app produce specific, defensible project ideas and plans with zero API
 * key — nothing here is random filler.
 *
 * DOMAINS      - problem domains a student can pick as an interest
 * ARCHETYPES   - reusable technical "shapes" a project can take, each with
 *                a real stack, endpoints, schema, challenges, deployment
 * SEEDS        - concrete problem statements per domain, each pointing at
 *                the archetype that best implements it
 * RESOURCES    - primary docs per skill, used for skill-gap suggestions
 */
'use strict';

const DOMAINS = [
  { key: 'HealthTech', label: 'HealthTech' },
  { key: 'FinTech', label: 'FinTech' },
  { key: 'EdTech', label: 'EdTech' },
  { key: 'AgriTech', label: 'AgriTech' },
  { key: 'Sustainability', label: 'Sustainability & Climate' },
  { key: 'SmartCity', label: 'Smart City & Civic Tech' },
  { key: 'Cybersecurity', label: 'Cybersecurity' },
  { key: 'Retail', label: 'Retail & E-commerce' },
  { key: 'Logistics', label: 'Logistics & Supply Chain' },
  { key: 'Accessibility', label: 'Accessibility' },
  { key: 'MentalWellness', label: 'Mental Wellness' },
  { key: 'Energy', label: 'Energy' },
];

/**
 * `weight` = rough implementation difficulty, 1 (simple CRUD) to 5 (real-time
 * ML/edge systems). Used directly in the feasibility-score formula.
 */
const ARCHETYPES = {
  'web-fullstack': {
    label: 'Full-Stack Web Application',
    weight: 2,
    skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL', 'REST APIs'],
    techStack: [
      { layer: 'Frontend', choice: 'React + Tailwind CSS', justification: 'Component reuse and utility-first styling let a solo student ship a polished UI fast without hand-rolling CSS.' },
      { layer: 'Backend', choice: 'Node.js + Express', justification: 'Same language as the frontend, so the whole team shares one mental model and one set of tooling.' },
      { layer: 'Database', choice: 'MongoDB with Mongoose', justification: 'Schema-flexible documents fit fast-changing student requirements better than upfront rigid SQL tables.' },
      { layer: 'Auth', choice: 'JWT-based sessions', justification: 'Stateless tokens avoid server-side session storage, which simplifies deployment on free hosting tiers.' },
      { layer: 'Hosting', choice: 'Vercel (client) + Render (API)', justification: 'Both have zero-cost tiers that handle a final-year project\'s traffic without a credit card.' },
    ],
    modules: ['Auth service', 'Core domain API', 'Admin/reporting dashboard', 'Notification layer'],
    apiEndpoints: [
      { method: 'POST', path: '/api/auth/register', purpose: 'Create an account' },
      { method: 'POST', path: '/api/auth/login', purpose: 'Authenticate and issue a JWT' },
      { method: 'GET', path: '/api/resource', purpose: 'List the core domain resource with filters' },
      { method: 'POST', path: '/api/resource', purpose: 'Create a new domain resource' },
      { method: 'PUT', path: '/api/resource/:id', purpose: 'Update a domain resource' },
      { method: 'DELETE', path: '/api/resource/:id', purpose: 'Remove a domain resource' },
      { method: 'GET', path: '/api/reports/summary', purpose: 'Aggregate stats for the dashboard' },
    ],
    collections: [
      { name: 'users', fields: ['name', 'email', 'passwordHash', 'role', 'createdAt'], notes: 'Core identity; index email unique.' },
      { name: 'resources', fields: ['ownerId', 'title', 'status', 'metadata', 'createdAt'], notes: 'The main domain entity; index ownerId + createdAt.' },
      { name: 'activityLogs', fields: ['userId', 'action', 'targetId', 'timestamp'], notes: 'Powers the recent-activity feed.' },
    ],
    challenges: [
      { challenge: 'Scope creep turning a CRUD app into an unbounded feature list', solution: 'Freeze an MVP feature list in week 1 and put everything else behind an explicit "stretch goals" backlog.' },
      { challenge: 'Auth and authorization bugs (users seeing data that is not theirs)', solution: 'Write an authorization middleware once and apply it to every route instead of checking ownership inline in each controller.' },
      { challenge: 'Free-tier database connection limits under load testing', solution: 'Reuse a single pooled Mongoose connection instead of connecting per-request, and cap pool size explicitly.' },
    ],
    testingStrategy: ['Unit tests for controllers/services with Jest', 'Integration tests against a test database (mongodb-memory-server)', 'Manual exploratory testing of auth edge cases', 'Basic load check with autocannon before the demo'],
    deployment: { frontend: 'Vercel', backend: 'Render or Railway', database: 'MongoDB Atlas free tier', steps: ['Push to GitHub', 'Connect repo to Vercel for the client', 'Connect repo to Render for the API, set env vars', 'Point MONGODB_URI at an Atlas free cluster', 'Set CORS to the deployed client origin'] },
  },
  'ml-service': {
    label: 'Machine Learning Prediction Service',
    weight: 3,
    skills: ['Python', 'Machine Learning', 'scikit-learn', 'Pandas', 'Flask', 'FastAPI', 'TensorFlow'],
    techStack: [
      { layer: 'Modeling', choice: 'Python + scikit-learn / XGBoost', justification: 'Tabular prediction problems rarely need deep learning; gradient-boosted trees train fast and are easy to explain in a viva.' },
      { layer: 'Model serving', choice: 'FastAPI', justification: 'Async, auto-generated OpenAPI docs, and far less boilerplate than Flask for a JSON prediction endpoint.' },
      { layer: 'Frontend', choice: 'React + Tailwind CSS', justification: 'A simple form-in, prediction-out UI does not need anything heavier.' },
      { layer: 'Experiment tracking', choice: 'MLflow (local) or a results notebook', justification: 'Reviewers will ask how you picked the final model — keep the comparison reproducible.' },
      { layer: 'Hosting', choice: 'Render / Hugging Face Spaces for the model API', justification: 'Both support Python services with a free tier suitable for a demo.' },
    ],
    modules: ['Data ingestion & cleaning', 'Feature engineering pipeline', 'Model training script', 'Prediction API', 'Explainability layer'],
    apiEndpoints: [
      { method: 'POST', path: '/predict', purpose: 'Run inference on a single input and return a prediction + confidence' },
      { method: 'POST', path: '/predict/batch', purpose: 'Score a batch of inputs from a CSV upload' },
      { method: 'GET', path: '/model/metadata', purpose: 'Return model version, training date, feature list' },
      { method: 'GET', path: '/model/metrics', purpose: 'Return accuracy/F1/RMSE from the held-out test set' },
      { method: 'POST', path: '/feedback', purpose: 'Log actual outcomes to enable future retraining' },
    ],
    collections: [
      { name: 'predictions', fields: ['inputFeatures', 'prediction', 'confidence', 'modelVersion', 'createdAt'], notes: 'Audit trail; index createdAt for the dashboard chart.' },
      { name: 'feedbackLog', fields: ['predictionId', 'actualOutcome', 'createdAt'], notes: 'Ground truth for measuring drift and future retraining.' },
    ],
    challenges: [
      { challenge: 'Small or imbalanced dataset skewing accuracy metrics', solution: 'Report precision/recall/F1 per class, not just accuracy, and use stratified k-fold cross-validation.' },
      { challenge: 'Training a model that looks good offline but fails on real inputs', solution: 'Hold out a genuinely unseen test split before any tuning, and validate with a few hand-picked adversarial examples.' },
      { challenge: 'Serving latency when the model is large', solution: 'Quantize or prune the model, or cache repeated inputs, and always show a confidence score so slow paths are visible.' },
    ],
    testingStrategy: ['Unit tests for the preprocessing/feature pipeline', 'Model evaluation on a held-out test set with a fixed random seed', 'API contract tests for /predict with pytest + httpx', 'Sanity-check predictions against known ground-truth examples'],
    deployment: { frontend: 'Vercel', backend: 'Render or Hugging Face Spaces', database: 'MongoDB Atlas or SQLite for a lightweight audit log', steps: ['Pickle/export the trained model with a version tag', 'Wrap it in a FastAPI app with input validation', 'Containerize with a slim Python base image', 'Deploy the container to Render', 'Point the React client at the deployed API URL'] },
  },
  'cv-realtime': {
    label: 'Real-Time Computer Vision System',
    weight: 5,
    skills: ['Python', 'OpenCV', 'Deep Learning', 'TensorFlow', 'PyTorch', 'YOLO', 'Computer Vision'],
    techStack: [
      { layer: 'Detection model', choice: 'YOLOv8 (Ultralytics) fine-tuned', justification: 'Best accuracy-to-speed ratio for real-time detection, and the training API needs only a few hundred labelled images to get a usable result.' },
      { layer: 'Video pipeline', choice: 'OpenCV for frame capture and pre/post-processing', justification: 'The de facto standard; handles webcam, video file, and RTSP streams identically.' },
      { layer: 'Serving', choice: 'FastAPI + WebSocket for live frame results', justification: 'Polling is too slow for "real time" — a WebSocket pushes detections to the browser as frames are processed.' },
      { layer: 'Frontend', choice: 'React with a canvas overlay', justification: 'Drawing bounding boxes on a <canvas> over the video feed is lightweight and framework-agnostic.' },
      { layer: 'Hosting', choice: 'A GPU-enabled free tier (Kaggle/Colab) for training, CPU inference for the demo', justification: 'Training needs a GPU; a well-optimised YOLO-nano model can run acceptably on CPU for a live demo.' },
    ],
    modules: ['Video capture service', 'Inference engine', 'Post-processing (tracking/NMS)', 'Alerting/notification layer', 'Results dashboard'],
    apiEndpoints: [
      { method: 'POST', path: '/stream/start', purpose: 'Begin processing a video/camera stream' },
      { method: 'WS', path: '/stream/live', purpose: 'Push per-frame detections to the client in real time' },
      { method: 'POST', path: '/detect/image', purpose: 'Run detection on a single uploaded image' },
      { method: 'GET', path: '/events', purpose: 'List detection events (e.g. intrusion, defect) with timestamps' },
      { method: 'GET', path: '/model/metrics', purpose: 'Return mAP and per-class precision/recall' },
    ],
    collections: [
      { name: 'detectionEvents', fields: ['streamId', 'label', 'confidence', 'boundingBox', 'frameTimestamp'], notes: 'Index streamId + frameTimestamp for the event timeline.' },
      { name: 'streams', fields: ['name', 'source', 'status', 'createdAt'], notes: 'Tracks configured camera/video sources.' },
    ],
    challenges: [
      { challenge: 'Real-time inference is too slow on CPU for a smooth demo', solution: 'Use the smallest viable model variant (e.g. YOLOv8n), downscale frames, and skip every other frame while interpolating.' },
      { challenge: 'Not enough labelled training data for the specific use case', solution: 'Start from a model pretrained on a large dataset and fine-tune on a small labelled set; use augmentation to multiply it.' },
      { challenge: 'False positives in cluttered or poorly lit scenes', solution: 'Tune a confidence threshold on a validation set and add temporal smoothing (require N consecutive detections) before alerting.' },
    ],
    testingStrategy: ['Evaluate mAP/precision/recall on a held-out labelled test set', 'Frame-rate benchmarking on target hardware before committing to a model size', 'Manual testing across varied lighting/angles', 'Regression check that retraining did not silently drop accuracy on old test cases'],
    deployment: { frontend: 'Vercel', backend: 'A CPU VM (Render/EC2) or an on-prem machine for the demo', database: 'MongoDB Atlas for event logs', steps: ['Export the fine-tuned model weights', 'Wrap inference in a FastAPI service with a WebSocket stream endpoint', 'Benchmark frame rate on the actual demo hardware ahead of time', 'Deploy behind a reverse proxy with WebSocket support enabled'] },
  },
  'nlp-rag': {
    label: 'NLP / Retrieval-Augmented Assistant',
    weight: 4,
    skills: ['Python', 'NLP', 'LangChain', 'Machine Learning', 'Transformers', 'Node.js'],
    techStack: [
      { layer: 'Retrieval', choice: 'Sentence-transformer embeddings + a vector store (Chroma/FAISS)', justification: 'RAG grounds answers in real documents, which avoids hallucination and lets you cite sources in the viva.' },
      { layer: 'Generation', choice: 'A hosted LLM API (Gemini/OpenAI-compatible) behind your own endpoint', justification: 'Training an LLM from scratch is out of scope for a final-year timeline; orchestrating one well is the actual skill being demonstrated.' },
      { layer: 'Orchestration', choice: 'LangChain or a hand-rolled retrieve-then-prompt pipeline', justification: 'A framework saves time wiring chunking/retrieval/prompting together, though a hand-rolled version is fine and easier to explain.' },
      { layer: 'Backend', choice: 'FastAPI or Node/Express', justification: 'Either works; pick whichever matches the rest of your stack so the team is not context-switching languages.' },
      { layer: 'Frontend', choice: 'React chat UI with streaming responses', justification: 'Token-by-token streaming makes the assistant feel responsive even when the underlying call takes a few seconds.' },
    ],
    modules: ['Document ingestion & chunking', 'Embedding & vector index', 'Retriever', 'Prompt-augmented generator', 'Chat UI'],
    apiEndpoints: [
      { method: 'POST', path: '/documents', purpose: 'Upload and index a document (chunk + embed + store)' },
      { method: 'POST', path: '/chat', purpose: 'Answer a question, retrieving relevant chunks first' },
      { method: 'GET', path: '/chat/:id/sources', purpose: 'Return the source chunks used for a given answer' },
      { method: 'DELETE', path: '/documents/:id', purpose: 'Remove a document from the index' },
      { method: 'GET', path: '/documents', purpose: 'List indexed documents' },
    ],
    collections: [
      { name: 'documents', fields: ['title', 'source', 'chunkCount', 'uploadedAt'], notes: 'Metadata for indexed source material.' },
      { name: 'chunks', fields: ['documentId', 'text', 'embeddingRef', 'position'], notes: 'One row per chunk; embeddingRef points into the vector store.' },
      { name: 'conversations', fields: ['userId', 'messages', 'updatedAt'], notes: 'Chat history, same shape as the platform Conversation model.' },
    ],
    challenges: [
      { challenge: 'The model answers confidently from outside the source documents', solution: 'Instruct the prompt to answer only from retrieved context and say "not found in the documents" otherwise; show citations so this is checkable.' },
      { challenge: 'Chunking strategy badly hurts retrieval quality', solution: 'Chunk by semantic unit (paragraph/heading) with overlap, not fixed character counts, and evaluate retrieval hit-rate on a small labelled query set.' },
      { challenge: 'API latency/cost from calling an LLM per query', solution: 'Cache answers for repeated questions, and use a smaller/faster model for retrieval-reranking than for final generation.' },
    ],
    testingStrategy: ['Build a small "golden" Q&A set and measure answer accuracy against it', 'Test retrieval hit-rate (is the right chunk in the top-k?) separately from generation quality', 'Latency testing under a few concurrent chats', 'Manual red-teaming for hallucinated or off-topic answers'],
    deployment: { frontend: 'Vercel', backend: 'Render/Railway for the API', database: 'A managed vector store (Pinecone free tier) or local FAISS + MongoDB Atlas for metadata', steps: ['Index the initial document set at deploy time', 'Deploy the API with the LLM provider key as a server-side secret', 'Deploy the chat client separately', 'Set a per-user rate limit before a public demo link goes out'] },
  },
  'mobile-app': {
    label: 'Cross-Platform Mobile App',
    weight: 3,
    skills: ['React Native', 'Flutter', 'JavaScript', 'Dart', 'Firebase', 'Mobile Development'],
    techStack: [
      { layer: 'App framework', choice: 'React Native (Expo)', justification: 'One codebase for iOS and Android, and Expo removes most native build/config pain for a time-boxed project.' },
      { layer: 'Backend', choice: 'Firebase (Auth, Firestore, Cloud Functions)', justification: 'Managed auth and a real-time database mean no server to run yourself, which matters when the team is small.' },
      { layer: 'State management', choice: 'React Context or Zustand', justification: 'Lighter than Redux for an app this size; less boilerplate for the same result.' },
      { layer: 'Push notifications', choice: 'Expo Notifications / Firebase Cloud Messaging', justification: 'Needed for reminders/alerts and both integrate directly with the chosen stack.' },
      { layer: 'Distribution', choice: 'Expo EAS build + APK sideload for the demo', justification: 'Avoids the Play Store review cycle while still producing an installable build for judges.' },
    ],
    modules: ['Onboarding & auth flow', 'Core feature screens', 'Offline-first local cache', 'Push notification service', 'Settings/profile'],
    apiEndpoints: [
      { method: 'POST', path: '/auth/session', purpose: 'Exchange a Firebase ID token for app session state' },
      { method: 'GET', path: '/items', purpose: 'List the core domain items for the signed-in user' },
      { method: 'POST', path: '/items', purpose: 'Create an item (works offline, syncs on reconnect)' },
      { method: 'POST', path: '/notifications/register', purpose: 'Register a device push token' },
      { method: 'GET', path: '/profile', purpose: 'Fetch the current user profile' },
    ],
    collections: [
      { name: 'users', fields: ['uid', 'displayName', 'pushToken', 'createdAt'], notes: 'Mirrors Firebase Auth uid; index uid.' },
      { name: 'items', fields: ['ownerUid', 'payload', 'syncStatus', 'updatedAt'], notes: 'syncStatus supports optimistic offline writes.' },
    ],
    challenges: [
      { challenge: 'Inconsistent behaviour between iOS and Android', solution: 'Test on both platforms weekly from day one, not just before submission; use Expo Go for fast iteration.' },
      { challenge: 'Data loss or conflicts when the app is used offline', solution: 'Queue writes locally with a syncStatus flag and reconcile on reconnect using last-write-wins or a version counter.' },
      { challenge: 'App feels slow on low-end devices', solution: 'Virtualise long lists (FlashList), lazy-load images, and profile with the React Native performance monitor before optimising blindly.' },
    ],
    testingStrategy: ['Component tests with Jest + React Native Testing Library', 'Manual device testing on at least one low-end Android phone', 'Offline/reconnect scenario testing', 'Expo EAS preview build tested by someone outside the team'],
    deployment: { frontend: 'Expo EAS Build (APK/IPA)', backend: 'Firebase (managed)', database: 'Firestore', steps: ['Configure Firebase project and security rules', 'Build with `eas build`', 'Distribute the APK link for the demo/judges', 'Keep Firestore rules restrictive — test them, do not leave them open'] },
  },
  'iot-edge': {
    label: 'IoT / Edge Sensing System',
    weight: 5,
    skills: ['C++', 'Arduino', 'Raspberry Pi', 'IoT', 'Embedded Systems', 'Python', 'MQTT'],
    techStack: [
      { layer: 'Sensing node', choice: 'ESP32 + relevant sensors', justification: 'Built-in WiFi/BLE removes the need for a separate radio module, and it is cheap enough to build several nodes on a student budget.' },
      { layer: 'Edge logic', choice: 'C++ (Arduino framework) or MicroPython', justification: 'Runs directly on the microcontroller for low-latency response without round-tripping to the cloud.' },
      { layer: 'Transport', choice: 'MQTT over WiFi to a broker', justification: 'Lightweight publish/subscribe designed for constrained devices, far less overhead than REST polling.' },
      { layer: 'Backend', choice: 'Node.js/Express or FastAPI subscribing to the broker', justification: 'Bridges MQTT into a normal REST API and database the rest of the app can use.' },
      { layer: 'Dashboard', choice: 'React with a live chart (recharts)', justification: 'Sensor data is inherently time-series; a live-updating chart communicates system state at a glance.' },
    ],
    modules: ['Sensor firmware', 'MQTT broker/bridge', 'Ingestion API', 'Time-series storage', 'Live dashboard & alerts'],
    apiEndpoints: [
      { method: 'POST', path: '/ingest', purpose: 'Bridge endpoint receiving bridged MQTT sensor readings' },
      { method: 'GET', path: '/readings', purpose: 'Query historical readings with time-range filters' },
      { method: 'GET', path: '/readings/latest', purpose: 'Get the most recent reading per device' },
      { method: 'POST', path: '/alerts/rules', purpose: 'Define a threshold rule that triggers a notification' },
      { method: 'GET', path: '/devices', purpose: 'List registered devices and their online status' },
    ],
    collections: [
      { name: 'readings', fields: ['deviceId', 'metric', 'value', 'timestamp'], notes: 'Time-series data; index deviceId + timestamp, consider a TTL index if raw data should expire.' },
      { name: 'devices', fields: ['deviceId', 'label', 'lastSeen', 'status'], notes: 'lastSeen drives the online/offline indicator.' },
      { name: 'alertRules', fields: ['metric', 'threshold', 'direction', 'notifyChannel'], notes: 'Evaluated against incoming readings.' },
    ],
    challenges: [
      { challenge: 'Unreliable WiFi drops sensor connections', solution: 'Buffer readings locally on the device and implement exponential-backoff reconnect with a small onboard queue.' },
      { challenge: 'Sensor noise producing false alerts', solution: 'Apply a moving-average or median filter before threshold checks, and require N consecutive breaches before alerting.' },
      { challenge: 'Power constraints for a battery-powered node', solution: 'Use deep-sleep between readings and batch-send over MQTT to cut radio-on time, the biggest power draw.' },
    ],
    testingStrategy: ['Bench test each sensor against a known reference value', 'Simulate WiFi drop-out and confirm buffered readings are not lost', 'Load-test the ingestion API with a script emulating many devices', 'Battery-life measurement if power is a project claim'],
    deployment: { frontend: 'Vercel for the dashboard', backend: 'A small always-on VM or Render for the MQTT bridge + API', database: 'MongoDB Atlas (or InfluxDB if you want native time-series)', steps: ['Flash firmware to each node with the broker address configured', 'Run/point to a public or self-hosted MQTT broker (e.g. HiveMQ Cloud free tier)', 'Deploy the bridge/API service subscribing to the broker', 'Deploy the live dashboard pointed at the API'] },
  },
};

/**
 * Concrete problem seeds per domain. Each seed's `techFocus` names the
 * ARCHETYPES key that best implements it. Keep these specific — they are
 * the raw material that makes generated ideas feel real instead of generic.
 */
const SEEDS = {
  HealthTech: [
    { problem: 'Rural patients skip follow-up care because the nearest specialist is hours away and symptom triage happens too late.', users: ['rural patients', 'primary-care nurses'], angle: 'AI symptom triage with teleconsult handoff', techFocus: 'web-fullstack', datasetHint: 'Symptom-to-specialty mapping dataset, WHO ICD-10 codes' },
    { problem: 'Diabetic patients struggle to estimate carbohydrate content of home-cooked meals, making glucose management inconsistent.', users: ['diabetic patients', 'dietitians'], angle: 'Photo-based food recognition with portion-aware carb estimation', techFocus: 'cv-realtime', datasetHint: 'Food-101 / Indian Food Image dataset (Kaggle)' },
    { problem: 'Small clinics lack the staff to review every chest X-ray promptly, delaying detection of treatable conditions.', users: ['radiology technicians', 'general physicians'], angle: 'Second-opinion triage model that flags likely-abnormal scans for priority review', techFocus: 'ml-service', datasetHint: 'NIH Chest X-ray14 dataset' },
  ],
  FinTech: [
    { problem: 'First-time earners have no simple way to see where their money actually goes across scattered UPI and bank transactions.', users: ['students', 'early-career professionals'], angle: 'Auto-categorised spend analytics from parsed bank/UPI statements', techFocus: 'web-fullstack', datasetHint: 'Anonymised sample bank statement CSVs you generate yourself' },
    { problem: 'Small vendors are denied microloans because they have no formal credit history the lender can score.', users: ['street vendors', 'microfinance officers'], angle: 'Alternative credit scoring from transaction cash-flow patterns', techFocus: 'ml-service', datasetHint: 'German Credit dataset / synthetic cash-flow data' },
    { problem: 'Retail investors get flooded with jargon-heavy company filings and cannot quickly judge financial health.', users: ['retail investors'], angle: 'RAG assistant that answers questions directly from a company\'s filings', techFocus: 'nlp-rag', datasetHint: 'Public annual reports / SEC EDGAR filings' },
  ],
  EdTech: [
    { problem: 'Students revising for exams cannot tell which topics they are actually weak in until it is too late.', users: ['students', 'teachers'], angle: 'Adaptive quiz engine that models per-topic mastery over time', techFocus: 'web-fullstack', datasetHint: 'Open quiz-response datasets (e.g. ASSISTments)' },
    { problem: 'Hostel/college libraries have no way to answer "does this book cover X" without a student reading it cover to cover.', users: ['students', 'librarians'], angle: 'RAG assistant answering questions directly from indexed textbook PDFs', techFocus: 'nlp-rag', datasetHint: 'Open textbook PDFs (NCERT/NPTEL notes)' },
    { problem: 'Instructors grading handwritten answer sheets spend hours on repetitive short-answer scoring.', users: ['instructors', 'TAs'], angle: 'OCR + semantic-similarity assisted grading with human override', techFocus: 'cv-realtime', datasetHint: 'IAM Handwriting dataset for OCR pretraining' },
  ],
  AgriTech: [
    { problem: 'Smallholder farmers lose yield to crop disease they cannot identify until it has spread across the field.', users: ['smallholder farmers', 'agricultural extension officers'], angle: 'Offline-capable leaf-photo disease classifier for low-connectivity villages', techFocus: 'cv-realtime', datasetHint: 'PlantVillage dataset' },
    { problem: 'Farmers over- or under-irrigate because soil moisture is judged by hand rather than measured.', users: ['farmers'], angle: 'Low-cost soil-moisture sensor network with irrigation recommendations', techFocus: 'iot-edge', datasetHint: 'Self-collected sensor logs; reference: FAO crop water-need tables' },
    { problem: 'Mandi (market) price volatility makes it hard for farmers to decide when to sell their harvest.', users: ['farmers', 'traders'], angle: 'Short-horizon price forecasting from historical mandi data', techFocus: 'ml-service', datasetHint: 'Agmarknet historical mandi price data (data.gov.in)' },
  ],
  Sustainability: [
    { problem: 'Households have no visibility into which appliances drive their electricity bill, so conservation advice stays generic.', users: ['households'], angle: 'Non-intrusive load monitoring to disaggregate appliance-level usage from one meter reading', techFocus: 'ml-service', datasetHint: 'REDD / UK-DALE energy disaggregation datasets' },
    { problem: 'Campus recycling bins are frequently contaminated because students cannot tell what counts as recyclable.', users: ['campus facilities staff', 'students'], angle: 'Camera-based waste-sorting assistant at the point of disposal', techFocus: 'cv-realtime', datasetHint: 'TrashNet dataset' },
    { problem: 'Local governments lack an easy way to estimate a neighbourhood\'s carbon footprint from public data.', users: ['municipal planners'], angle: 'Dashboard estimating footprint from public energy/transport datasets', techFocus: 'web-fullstack', datasetHint: 'data.gov.in energy & transport open datasets' },
  ],
  SmartCity: [
    { problem: 'Commuters have no reliable way to know which bus is actually about to arrive versus the printed schedule.', users: ['daily commuters', 'transit authorities'], angle: 'Crowd-sourced real-time arrival prediction from rider check-ins', techFocus: 'web-fullstack', datasetHint: 'GTFS public transit feed for your city if available' },
    { problem: 'Municipal pothole/streetlight complaints get lost in unstructured phone calls with no tracking.', users: ['citizens', 'municipal staff'], angle: 'Photo-based civic issue reporting with automatic categorisation and status tracking', techFocus: 'cv-realtime', datasetHint: 'Self-collected labelled street-defect photos' },
    { problem: 'Parking search in dense areas wastes commuter time and adds avoidable congestion.', users: ['drivers', 'city planners'], angle: 'Camera or sensor-based real-time parking availability map', techFocus: 'iot-edge', datasetHint: 'PKLot parking-lot image dataset' },
  ],
  Cybersecurity: [
    { problem: 'Small businesses cannot afford a SOC, so phishing emails that pass basic filters still reach employees.', users: ['small-business employees', 'IT admins'], angle: 'ML-based phishing-email classifier with an explainable flag list', techFocus: 'ml-service', datasetHint: 'Nazario phishing corpus + Enron email dataset (ham examples)' },
    { problem: 'Junior developers ship code with common vulnerability patterns because manual review cannot catch everything.', users: ['student dev teams', 'code reviewers'], angle: 'Static-analysis assistant that explains vulnerabilities in plain language', techFocus: 'nlp-rag', datasetHint: 'OWASP Top 10 examples + CVE descriptions' },
    { problem: 'Home network owners have no simple way to know if an IoT device on their network is behaving abnormally.', users: ['home users'], angle: 'Lightweight network traffic anomaly detector for home routers', techFocus: 'ml-service', datasetHint: 'CICIDS2017 network intrusion dataset' },
  ],
  Retail: [
    { problem: 'Small e-commerce sellers cannot afford enterprise recommendation engines, so cross-sell revenue is left on the table.', users: ['small online sellers', 'shoppers'], angle: 'Lightweight collaborative-filtering recommender pluggable into any storefront', techFocus: 'ml-service', datasetHint: 'Amazon/Instacart public purchase-history datasets' },
    { problem: 'Local retailers manually recount shelf stock, so out-of-stock items go unnoticed for days.', users: ['store staff'], angle: 'Shelf-photo based stock-level and misplaced-item detection', techFocus: 'cv-realtime', datasetHint: 'SKU-110K retail shelf dataset' },
    { problem: 'Shoppers abandon carts when they cannot quickly compare product specs across listings.', users: ['online shoppers'], angle: 'Assistant that answers spec-comparison questions across scraped/indexed listings', techFocus: 'nlp-rag', datasetHint: 'Self-scraped product listing pages (respect robots.txt)' },
  ],
  Logistics: [
    { problem: 'Last-mile delivery riders take inefficient routes because static map apps ignore live local conditions.', users: ['delivery riders', 'dispatchers'], angle: 'Route optimisation layered on top of a maps API with delivery-window constraints', techFocus: 'web-fullstack', datasetHint: 'OpenStreetMap + a synthetic delivery-order dataset you generate' },
    { problem: 'Warehouse staff spend excessive time locating misplaced inventory.', users: ['warehouse staff'], angle: 'Camera-assisted shelf-location verification against a inventory system', techFocus: 'cv-realtime', datasetHint: 'Self-collected warehouse shelf photos' },
    { problem: 'Fleet operators cannot predict vehicle maintenance needs until something actually breaks.', users: ['fleet managers'], angle: 'Predictive maintenance from OBD/sensor telemetry', techFocus: 'iot-edge', datasetHint: 'NASA Turbofan / AI4I predictive maintenance dataset' },
  ],
  Accessibility: [
    { problem: 'Visually impaired users cannot independently verify currency notes or read printed text without help.', users: ['visually impaired users'], angle: 'Phone-camera assistant that reads text and identifies currency aloud', techFocus: 'cv-realtime', datasetHint: 'ICDAR OCR dataset + self-collected currency note images' },
    { problem: 'Deaf students in mainstream classrooms miss spoken lecture content in real time.', users: ['deaf/hard-of-hearing students'], angle: 'Live speech-to-text captioning with domain-specific vocabulary tuning', techFocus: 'nlp-rag', datasetHint: 'LibriSpeech / Common Voice for speech-to-text fine-tuning' },
    { problem: 'Websites are frequently unusable with screen readers despite looking fine visually.', users: ['screen-reader users', 'web developers'], angle: 'Automated accessibility auditor that explains fixes, not just flags issues', techFocus: 'web-fullstack', datasetHint: 'WebAIM Million accessibility audit dataset' },
  ],
  MentalWellness: [
    { problem: 'Students under exam stress often do not recognise burnout patterns until they are already struggling academically.', users: ['college students', 'counsellors'], angle: 'Journalling app that surfaces mood/stress trends and nudges toward support resources', techFocus: 'web-fullstack', datasetHint: 'DAIC-WOZ / self-reported mood-tracking sample data' },
    { problem: 'Campus counselling centres are understaffed relative to demand for a first point of contact.', users: ['students'], angle: 'Guided self-help chat assistant with clear escalation to human counsellors for risk cases', techFocus: 'nlp-rag', datasetHint: 'Public CBT self-help worksheet content (with clear escalation rules, not a clinical replacement)' },
    { problem: 'Sleep and mood correlations are hard for individuals to notice without tracking over time.', users: ['individuals self-tracking wellbeing'], angle: 'Wearable/phone-sensor mood-pattern dashboard', techFocus: 'iot-edge', datasetHint: 'PMData / StudentLife open sensing datasets' },
  ],
  Energy: [
    { problem: 'Solar panel owners cannot tell when panel output has degraded versus normal weather-driven variation.', users: ['residential solar owners'], angle: 'Anomaly detection comparing live output against a weather-adjusted expected curve', techFocus: 'ml-service', datasetHint: 'Open PV output + weather station datasets' },
    { problem: 'Campus buildings run HVAC on fixed schedules regardless of actual occupancy, wasting energy.', users: ['facilities managers'], angle: 'Occupancy-sensing based HVAC scheduling recommendation system', techFocus: 'iot-edge', datasetHint: 'ASHRAE building occupancy/energy dataset' },
    { problem: 'EV owners in a shared building have no fair way to coordinate limited charging points.', users: ['EV owners', 'building managers'], angle: 'Smart booking and load-balancing system for shared charging points', techFocus: 'web-fullstack', datasetHint: 'Self-modelled EV charging session dataset' },
  ],
};

/**
 * Primary documentation per skill, used for skill-gap suggestions in the
 * mentor chat and detailed plan. Absolute https URLs only.
 */
const RESOURCES = {
  'React': [{ label: 'React Docs', url: 'https://react.dev/learn' }],
  'Node.js': [{ label: 'Node.js Docs', url: 'https://nodejs.org/en/docs' }],
  'Express': [{ label: 'Express Guide', url: 'https://expressjs.com/en/guide/routing.html' }],
  'MongoDB': [{ label: 'MongoDB Manual', url: 'https://www.mongodb.com/docs/manual/' }],
  'Mongoose': [{ label: 'Mongoose Docs', url: 'https://mongoosejs.com/docs/guide.html' }],
  'Python': [{ label: 'Python Docs', url: 'https://docs.python.org/3/' }],
  'Machine Learning': [{ label: 'scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html' }],
  'TensorFlow': [{ label: 'TensorFlow Tutorials', url: 'https://www.tensorflow.org/tutorials' }],
  'PyTorch': [{ label: 'PyTorch Tutorials', url: 'https://pytorch.org/tutorials/' }],
  'OpenCV': [{ label: 'OpenCV-Python Tutorials', url: 'https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html' }],
  'Computer Vision': [{ label: 'Ultralytics YOLO Docs', url: 'https://docs.ultralytics.com/' }],
  'NLP': [{ label: 'Hugging Face NLP Course', url: 'https://huggingface.co/learn/nlp-course' }],
  'LangChain': [{ label: 'LangChain Docs', url: 'https://python.langchain.com/docs/introduction/' }],
  'FastAPI': [{ label: 'FastAPI Docs', url: 'https://fastapi.tiangolo.com/' }],
  'Flask': [{ label: 'Flask Docs', url: 'https://flask.palletsprojects.com/' }],
  'React Native': [{ label: 'React Native Docs', url: 'https://reactnative.dev/docs/getting-started' }],
  'Flutter': [{ label: 'Flutter Docs', url: 'https://docs.flutter.dev/' }],
  'Firebase': [{ label: 'Firebase Docs', url: 'https://firebase.google.com/docs' }],
  'Arduino': [{ label: 'Arduino Language Reference', url: 'https://www.arduino.cc/reference/en/' }],
  'Raspberry Pi': [{ label: 'Raspberry Pi Documentation', url: 'https://www.raspberrypi.com/documentation/' }],
  'IoT': [{ label: 'MQTT Essentials', url: 'https://www.hivemq.com/mqtt-essentials/' }],
  'SQL': [{ label: 'PostgreSQL Tutorial', url: 'https://www.postgresql.org/docs/current/tutorial.html' }],
  'Docker': [{ label: 'Docker Docs', url: 'https://docs.docker.com/get-started/' }],
  'REST APIs': [{ label: 'MDN: HTTP APIs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' }],
  'Blockchain': [{ label: 'Ethereum Docs', url: 'https://ethereum.org/en/developers/docs/' }],
  'JavaScript': [{ label: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' }],
};

/**
 * Pick the archetype best matching a student's known skills, preferring
 * `preferredKey` (e.g. a seed's techFocus) when the student has at least
 * one overlapping skill with it; otherwise scores every archetype by
 * skill overlap and returns the best match.
 */
function archetypeForSkills(skills = [], preferredKey) {
  const norm = new Set(skills.map((s) => String(s).toLowerCase().trim()));

  const overlapCount = (key) => {
    const arch = ARCHETYPES[key];
    if (!arch) return -1;
    return arch.skills.reduce((n, s) => n + (norm.has(s.toLowerCase()) ? 1 : 0), 0);
  };

  if (preferredKey && ARCHETYPES[preferredKey] && (overlapCount(preferredKey) > 0 || norm.size === 0)) {
    return preferredKey;
  }

  let bestKey = preferredKey && ARCHETYPES[preferredKey] ? preferredKey : 'web-fullstack';
  let bestScore = -1;
  for (const key of Object.keys(ARCHETYPES)) {
    const score = overlapCount(key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

module.exports = { DOMAINS, ARCHETYPES, SEEDS, RESOURCES, archetypeForSkills };
