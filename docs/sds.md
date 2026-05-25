# Software Design Specification (SDS)

## 1. Purpose
This document describes the current design of ShurukerAi as implemented in the repository. It covers the web application structure, major modules, data flows, storage model, and runtime dependencies.

## 2. System Architecture
ShurukerAi uses a React frontend with a Flask backend/API.

- `web.py` is the main application server and API layer.
- `main.py` contains the RAG engine, embedding logic, chunking pipeline, and Gemini/Pinecone integration.
- `react-frontend/src/` contains the page-level React UI.
- `static/js/` contains a few shared legacy helper scripts still loaded by React pages.
- `static/css/style.css` provides the shared presentation layer.
- `data/` stores explore trend JSON that is fetched by the frontend.
- `uploads/` stores freelancer portfolio files when Firebase Storage is unavailable or as a local fallback.

## 3. Technology Stack
- Backend web framework: Flask
- Authentication: Firebase Authentication
- Database: Firestore
- File storage: Firebase Storage with local fallback for uploads
- RAG / vector search: Pinecone
- LLM and embeddings: Google Gemini, with local SentenceTransformer fallback for embedding generation
- PDF parsing: PyPDF2
- Frontend charting: Chart.js, used by the explore view
- Environment management: `python-dotenv`

## 4. Runtime Entry Points
### 4.1 `web.py`
`web.py` is the user-facing application. It initializes Firebase Admin if a service account key is present, starts a background warmup thread on the first request, and exposes all page routes and JSON endpoints.

### 4.2 `main.py`
`main.py` is the business-assistant engine. It loads environment variables, initializes Gemini and Pinecone clients, creates or loads cached document chunks, and can generate an answer for a user query using retrieved context.

## 5. Major Components
### 5.1 Presentation Layer
The React pages provide the shells for the main experiences:
- Public pages: landing, learn, login, freelancer login, explore, freelancers, category views
- Authenticated pages: chat, client messages, freelancer inbox, freelancer registration
- Administration: admin dashboard

Shared scripts attach behavior where needed:
- `chat.js` handles conversation management and AI chat requests.
- `explore.js` handles chart rendering, city slicing, and probability scoring.
- `direct_messages.js` handles DM thread loading, message display, and sending.

### 5.2 Authentication and Session Layer
The application uses Firebase ID token verification on `/verify-token` and stores the resulting identity in the Flask session.

Session data is used to:
- identify the current user
- route standard users to chat after login
- protect authenticated routes with `login_required`
- check freelancer approval before allowing inbox access

### 5.3 Chat and Conversation Layer
The chat subsystem uses the following design:
- The frontend creates or loads conversations.
- Conversation metadata is stored under `users/<uid>/conversations`.
- Messages are stored in the nested `messages` subcollection.
- When a prompt is submitted, the backend retrieves context from Pinecone, combines it with conversation history, and sends the prompt to Gemini.
- The response is returned to the browser and persisted as an assistant message.

### 5.4 Explore and Probability Layer
The explore subsystem is entirely browser-driven after the JSON file is served.

Design flow:
- Fetch `/data/explore_data.json`
- Transform the category/city data into chart series
- Render a line chart for the selected city or the national aggregate
- Compute top movers from growth rate
- Compute a probability score using category heat, city weight, budget weight, and advantage flags
- Render recommendations based on the score band

### 5.5 Freelancer Registration Layer
The freelancer registration flow collects profile fields and a portfolio file.

Design behavior:
- The form is available only to authenticated users.
- The backend validates required fields.
- The portfolio PDF is uploaded to Firebase Storage when configured.
- If storage is unavailable, the file is saved locally under `uploads/freelancers/<uid>/`.
- The freelancer document is created in Firestore with a pending moderation status.

### 5.6 Direct Messaging Layer
Direct messaging is modeled as a thread between one client and one approved freelancer.

Thread design:
- `dm_threads/<threadId>` stores participants, names, the latest message preview, unread counts, and timestamps.
- `dm_threads/<threadId>/messages` stores individual messages with sender and timestamp.
- The client UI can start a thread from a freelancer profile query parameter.
- The freelancer inbox lists only threads that include the freelancer as a participant.

### 5.7 Admin Moderation Layer
The admin system uses a JWT-style bearer token after a username/password login.

Design behavior:
- Admin credentials are checked in `/api/admin/login`.
- A signed token is generated and stored client-side for subsequent admin requests.
- The admin review endpoint reads all freelancer documents and groups them into pending, approved, rejected, and removed states.
- Moderation endpoints update both `freelancers` and `users` documents so the account state remains consistent.

## 6. Data Model
### 6.1 Firestore collections
- `users/<uid>`
  - `email`
  - `displayName`
  - `role`
  - `isFreelancer`
  - `freelancerStatus`
  - `lastLogin`
  - `createdAt`
  - `updatedAt`

- `users/<uid>/conversations/<conversationId>`
  - `title`
  - `createdAt`
  - `updatedAt`
  - `messageCount`

- `users/<uid>/conversations/<conversationId>/messages/<messageId>`
  - `role`
  - `content`
  - `timestamp`

- `freelancers/<uid>`
  - `fullName`
  - `email`
  - `category`
  - `bio`
  - `portfolioLink`
  - `portfolioPdfUrl`
  - `isApproved`
  - `isRejected`
  - `isRemoved`
  - moderation timestamps such as `approvedAt`, `rejectedAt`, `removedAt`, `restoredAt`

- `dm_threads/<threadId>`
  - `participants`
  - `clientUid`
  - `freelancerUid`
  - `clientName`
  - `freelancerName`
  - `freelancerCategory`
  - `lastMessage`
  - `lastMessageAt`
  - `updatedAt`
  - `createdAt`
  - `unreadCount`

- `dm_threads/<threadId>/messages/<messageId>`
  - `senderId`
  - `text`
  - `createdAt`

### 6.2 File-based data
- `data/explore_data.json` contains the current market trend payload.
- `chunks_cache.json` caches parsed business content chunks used by the RAG pipeline.
- `firebase-key.json` provides Firebase Admin service-account credentials when present.

## 7. Integration Design
### 7.1 Firebase
Firebase is used for user authentication, Firestore persistence, and storage bucket access.

### 7.2 Pinecone
Pinecone holds the vector index used to retrieve support context for chat responses.

### 7.3 Google Gemini
Gemini generates the final assistant response and can also generate embeddings when configured for that mode.

### 7.4 Local Embedding Fallback
If Gemini embeddings are not used, `SentenceTransformer('all-mpnet-base-v2')` provides local embeddings for chunk retrieval and warmup.

## 8. Error Handling Strategy
- Missing chat data or query input returns a JSON error instead of crashing the server.
- Unauthorized or expired sessions redirect users to login.
- Explore data load failures are caught in the frontend and leave the page usable.
- Firebase Storage configuration failures fall back to local upload storage.
- DM and admin endpoints verify authorization before acting on records.

## 9. Configuration and Secrets
Current runtime configuration depends on the following values or files:
- `SECRET_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `PINECONE_API_KEY`
- `GEMINI_API_KEY`
- `firebase-key.json`

Admin credentials are currently defined in the server code and are used to mint the admin token. That design matches the present implementation, although it should be externalized before production use.

## 10. Design Notes and Constraints
- The chat subsystem is designed around user-scoped conversations rather than a shared global transcript.
- The freelancer inbox only opens for approved freelancer accounts.
- The DM subsystem is asymmetric: the client starts the thread, and the freelancer receives it in the inbox.
- The explore module is intentionally read-only and driven by the served JSON snapshot.
- The main business assistant workflow is still command-line friendly in `main.py`, but the web server imports its functions as needed.