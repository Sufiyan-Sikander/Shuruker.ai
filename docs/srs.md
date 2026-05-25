# Software Requirements Specification (SRS)

## 1. Overview
- **Product:** ShurukerAi
- **Purpose:** Provide a Pakistan-focused AI business platform with RAG chat, explore/probability insights, freelancer onboarding, direct messaging, and admin moderation.
- **Primary users:** Visitors, authenticated users, freelancer applicants, approved freelancers, and administrators.
- **System boundary:** A Flask web application served by `web.py`, backed by Firebase services, Pinecone, and a Gemini-based RAG engine in `main.py`.

## 2. Product Goals
- Help users ask business and startup questions through an AI assistant with conversation history.
- Help users explore market-interest trends by city and category.
- Help freelancer applicants register, upload a portfolio, and be moderated by admins.
- Support client-to-freelancer direct messages after approval.
- Keep the UI responsive, mobile-friendly, and functional even when some data sources are unavailable.

## 3. Scope
### In scope
- Public landing, learn, login, freelancer login, explore, freelancer listing, and admin pages.
- Authenticated chat with persistent conversations and message history.
- Explore dashboard with chart, city filtering, insights, top movers, and probability scoring.
- Freelancer registration with PDF upload and Firestore persistence.
- Client and freelancer direct messaging.
- Admin authentication and freelancer moderation actions.

### Out of scope
- Payment processing.
- Multi-tenant enterprise administration.
- Realtime analytics dashboards beyond the current explore view.
- Automated external business registry integrations.

## 4. User Classes
- **Visitor:** Browses landing pages and public freelancer listings.
- **Authenticated user:** Uses chat, client messages, and other protected views.
- **Freelancer applicant:** Submits a profile and portfolio for approval.
- **Approved freelancer:** Receives direct messages and views inbox conversations.
- **Administrator:** Reviews, approves, rejects, soft-removes, restores, or deletes freelancer profiles.

## 5. Functional Requirements
### 5.1 Public Experience
- **FR1:** The system shall render the landing page at `/`.
- **FR2:** The system shall expose public informational pages at `/learn`, `/explore`, `/freelancers`, and `/freelancers/<category>`.
- **FR3:** The system shall serve JSON trend data from `/data/<path>` and uploaded files from `/uploads/<path>`.

### 5.2 Authentication and Session Management
- **FR4:** The system shall verify Firebase ID tokens through `/verify-token` and create a server session.
- **FR5:** The system shall expose `/api/me` so the frontend can determine the current user role and routing state.
- **FR6:** The system shall allow logout through `/logout` by clearing the active session.

### 5.3 AI Chat Experience
- **FR7:** The system shall allow authenticated users to create and manage chat conversations.
- **FR8:** The system shall persist conversations and messages under Firestore user subcollections.
- **FR9:** The system shall process chat prompts through `/api/chat` using retrieved context and conversation history.
- **FR10:** The system shall allow users to list, create, read, and delete conversations through `/api/conversations` endpoints.

### 5.4 Explore and Probability Workflow
- **FR11:** The system shall load trend data from `/data/explore_data.json`.
- **FR12:** The system shall render a line chart for the last six months by city or national aggregate.
- **FR13:** The system shall show summary insights for momentum, stability, and volume.
- **FR14:** The system shall compute a probability score from idea category, city, budget, and advantage inputs.
- **FR15:** The system shall display score labels and recommendations based on the computed score.

### 5.5 Freelancer Registration and Listing
- **FR16:** The system shall allow authenticated users to open the freelancer registration form at `/register-freelancer`.
- **FR17:** The system shall accept freelancer profile data and a portfolio PDF through `/api/register-freelancer`.
- **FR18:** The system shall expose approved freelancer profiles through `/api/freelancers`.

### 5.6 Direct Messaging
- **FR19:** The system shall start or reuse a client-to-freelancer thread through `/api/dm/start`.
- **FR20:** The system shall list the signed-in user’s DM threads through `/api/dm/threads`.
- **FR21:** The system shall list and post messages for a selected DM thread.
- **FR22:** The system shall track unread counts and last-message metadata per thread.

### 5.7 Admin Moderation
- **FR23:** The system shall render the admin dashboard at `/admin`.
- **FR24:** The system shall authenticate admin users through `/api/admin/login`.
- **FR25:** The system shall let authenticated admins review freelancer submissions and statistics.
- **FR26:** The system shall support approve, reject, soft-remove, restore, and permanent delete actions for freelancer profiles.

## 6. Data and Content Requirements
- Trend data shall be stored in `data/explore_data.json`.
- Freelancer portfolio uploads shall be stored either in Firebase Storage or locally under `uploads/freelancers/<uid>/`.
- Chat data shall be stored in Firestore under `users/<uid>/conversations/<conversationId>/messages`.
- Freelancer profiles shall be stored in Firestore under `freelancers/<uid>`.
- Direct messages shall be stored in Firestore under `dm_threads/<threadId>/messages`.

## 7. Integration Requirements
- The system shall integrate with Firebase Authentication for user identity.
- The system shall integrate with Firestore for profile, conversation, and messaging persistence.
- The system shall integrate with Firebase Storage when a bucket is configured.
- The system shall integrate with Pinecone for vector search and context retrieval.
- The system shall integrate with Google Gemini for answer generation and embeddings where configured.
- The explore data pipeline shall remain supported by the scripts in `scripts/`.

## 8. Non-Functional Requirements
- **Performance:** The UI shall remain responsive on desktop and mobile browsers, and cached explore data should render quickly after load.
- **Reliability:** If the explore data fetch fails, the page shall remain usable and report the problem without crashing.
- **Security:** Secrets such as Firebase and AI service keys shall be provided through environment configuration where supported.
- **Compatibility:** The application shall work in modern Chromium-based browsers and Firefox.
- **Maintainability:** Backend routes, React pages, and client scripts shall remain separated by feature area.

## 9. Acceptance Criteria
- A signed-in user can open chat, send a prompt, and retrieve a persisted response thread later.
- A visitor can open explore, change city filters, and see chart and insight updates.
- A freelancer applicant can submit a profile and portfolio file.
- An admin can log in and change a freelancer’s moderation status.
- A client can start a DM thread with an approved freelancer and continue the conversation.

## 10. Traceability Notes
- Chat behavior is implemented in `web.py` and consumed by the React chat page plus `static/js/chat.js`.
- Explore behavior is implemented in `static/js/explore.js` and consumed by `data/explore_data.json`.
- Direct messaging behavior is implemented in `web.py` and consumed by the React message pages plus `static/js/direct_messages.js`.
- RAG logic is implemented in `main.py`.
