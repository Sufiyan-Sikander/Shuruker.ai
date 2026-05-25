import os
import json
from pinecone import Pinecone, ServerlessSpec
from google import genai
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import time

# -----------------------------------------------------
#                LOAD ENVIRONMENT VARIABLES
# -----------------------------------------------------
load_dotenv()  # Load from .env file

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

CHUNKS_JSON_PATH = "chunks_cache.json"
UPSERT_ONCE = False   # Set True only the FIRST time
DEFAULT_PDF_FOLDER = os.path.join(os.path.dirname(__file__), "data")


if not PINECONE_API_KEY or not GEMINI_API_KEY:
    raise ValueError("❌ Missing API keys! Please set PINECONE_API_KEY and GEMINI_API_KEY in your .env file.")

# Initialize services
client = genai.Client(api_key=GEMINI_API_KEY)
pc = Pinecone(api_key=PINECONE_API_KEY)

INDEX_NAME = "shuruker-rag-index"
EMBED_MODEL = "models/embedding-001"   # 768-dim Gemini embedding

# Local embedding model for fallback/testing
local_model = SentenceTransformer('all-mpnet-base-v2')

# -----------------------------------------------------
#      SYSTEM PROMPT (UPDATED FOR SHURUKER)
# -----------------------------------------------------
SYSTEM_PROMPT = """
You are **ShuruKer – Pakistan’s Smart Business Launch Partner**.

Your role is to assist users **ONLY with business, startup, entrepreneurship, freelancing, and income-related topics**, especially in the context of Pakistan.

--- STRICT GUARDRAILS ---
1. If the user's question is NOT related to:
   - business ideas
   - startups
   - entrepreneurship
   - freelancing
   - e-commerce
   - marketing
   - branding
   - finance
   - legal setup in Pakistan
   - growth, operations, or monetization

   👉 Politely refuse and say:
   "I’m designed to help only with business and startup-related questions. Please ask something related to business or entrepreneurship."

2. Do NOT answer questions about:
   - personal life
   - politics
   - religion
   - entertainment
   - coding help unrelated to business systems
   - general knowledge
   - health or medical advice
   - non-business education topics

--- RESPONSE RULES ---
3. Answer ONLY what the user has asked.
4. If the question is broad, give a concise structured overview.
5. If the question is specific, give a short, focused answer.
6. Expand into a full business plan ONLY if explicitly requested.
7. Use Pakistan-specific context where relevant.
8. Be actionable, simple, and mentor-like.

--- FREELANCER RECOMMENDATIONS ---
9. When a user mentions challenges that match freelancer expertise, suggest our platform:
   - If they mention "no traffic", "low sales", "need ads", "not getting customers" → suggest Ad Managers at /freelancers/Ad%20Manager
   - If they ask about "marketing strategy", "growth tactics", "how to reach customers" → suggest Marketing Consultants at /freelancers/Marketing%20Consultant
   - If they need "business planning", "scaling strategy", "expansion" → suggest Strategic Planners at /freelancers/Strategic%20Planner
   - If they ask about "business setup", "operations", "systems" → suggest Business Consultants at /freelancers/Business%20Consultant
   
    Format suggestion like: "💡 **Pro Tip:** You might benefit from hiring a [Professional Type] from our platform. [Click here to find available specialists](/freelancers/[Category])"

--- RESPONSE LENGTH ---
- Short questions → 5–8 bullet points max
- Broad questions → concise structured sections

Tone: Friendly, Pakistani, practical, professional.
"""


# -----------------------------------------------------
#         PDF → USER/RESPONSE EXTRACTOR
# -----------------------------------------------------
def extract_pairs_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""

    for page in reader.pages:
        text += page.extract_text() + "\n"

    pairs = []
    sections = text.split("User:")

    for sec in sections[1:]:
        try:
            user_part = sec.split("Response:")[0].strip()
            resp_part = sec.split("Response:")[1].strip()
            pairs.append({"user": user_part, "response": resp_part})
        except:
            continue

    return pairs

# -----------------------------------------------------
#        LOAD AND PARSE ALL PDFs IN FOLDER
# -----------------------------------------------------
def load_dataset(pdf_folder=DEFAULT_PDF_FOLDER):
    if not os.path.exists(pdf_folder):
        raise FileNotFoundError(f"Folder not found: {pdf_folder}")

    dataset = []

    for file in os.listdir(pdf_folder):
        if file.endswith(".pdf"):
            full_path = os.path.join(pdf_folder, file)
            print("Extracting from:", file)
            dataset += extract_pairs_from_pdf(full_path)

    print("TOTAL PAIRS LOADED:", len(dataset))
    return dataset

# -----------------------------------------------------
#                 CHUNK CREATION
# -----------------------------------------------------
def build_chunks(pairs):
    merged_texts = []
    for p in pairs:
        full = f"User: {p['user']}\nResponse: {p['response']}"
        merged_texts.append(full)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=150
    )

    docs = []
    for i, txt in enumerate(merged_texts):
        chunks = splitter.split_text(txt)
        for ch in chunks:
            docs.append({"id": f"chunk_{i}_{len(docs)}", "text": ch})

    print("Total Chunks:", len(docs))
    return docs

def load_or_create_chunks(pdf_folder=DEFAULT_PDF_FOLDER):
    # Load cached chunks if they exist
    if os.path.exists(CHUNKS_JSON_PATH):
        print("✅ Loading chunks from cache...")
        with open(CHUNKS_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    # Otherwise create chunks once
    print("📄 No cache found. Extracting PDFs & creating chunks...")

    pairs = load_dataset(pdf_folder)
    chunks = build_chunks(pairs)

    with open(CHUNKS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print("✅ Chunks cached successfully.")
    return chunks


# -----------------------------------------------------
# BATCHED EMBEDDING FUNCTION WITH LOCAL FALLBACK
# -----------------------------------------------------
def get_embeddings(texts, use_gemini=False, batch_size=50):
    embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]

        if use_gemini:
            try:
                for txt in batch:
                    result = client.models.embed_content(model=EMBED_MODEL, content=txt)
                    embeddings.append(result.embeddings[0].values)
                print(f"Gemini embeddings: processed batch {i}-{i+len(batch)-1}")
                continue
            except Exception as e:
                print(f"Gemini API failed: {e}. Falling back to local embeddings.")

        # Local fallback
        local_emb = local_model.encode(batch).tolist()
        embeddings.extend(local_emb)
        print(f"Local embeddings: processed batch {i}-{i+len(batch)-1}")

        if use_gemini:
            time.sleep(1)  # prevent hitting rate limits

    return embeddings

# -----------------------------------------------------
#       PINECONE INDEX INITIALIZATION
# -----------------------------------------------------

def init_pinecone_index():
    existing = [idx["name"] for idx in pc.list_indexes()]

    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=768,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        print("Created index:", INDEX_NAME)

    return pc.Index(INDEX_NAME)

# -----------------------------------------------------
#            STORE ALL CHUNKS IN PINECONE
# -----------------------------------------------------
def upsert_chunks(index, docs, use_gemini=False, batch_size=50):
    print("Starting upsert of chunks...")

    texts = [d["text"] for d in docs]
    embeddings = get_embeddings(texts, use_gemini=use_gemini, batch_size=batch_size)

    vectors = []
    for d, emb in zip(docs, embeddings):
        vectors.append({
            "id": d["id"],
            "values": emb,
            "metadata": {"text": d["text"]}
        })

    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(batch)
        print(f"Upserted batch {i}-{i+len(batch)-1}")

    print("Upsert completed successfully.")

# -----------------------------------------------------
#                RAG RETRIEVER
# -----------------------------------------------------
def retrieve_context(index, query, top_k=5, use_gemini=False):
    if use_gemini:
        result = client.models.embed_content(model=EMBED_MODEL, content=query)
        q_emb = result.embeddings[0].values
    else:
        q_emb = local_model.encode([query])[0].tolist()

    results = index.query(
        vector=q_emb,
        top_k=top_k,
        include_metadata=True
    )

    texts = [m["metadata"]["text"] for m in results["matches"]]
    return "\n\n".join(texts)

# -----------------------------------------------------
#                 FINAL LLM GENERATOR
# -----------------------------------------------------
def shuruker_answer(query, context, history=None):
    model = "gemini-2.5-flash"  # Hit rate limit
    # model = "gemini-1.5-pro"  # Valid model with free tier  

    # Build conversation history string
    history_text = ""
    if history and len(history) > 1:  # More than just the current query
        history_text = "\n\nCONVERSATION HISTORY:\n"
        # Only include previous messages (not the current one)g
        for msg in history[:-1]:
            role = "USER" if msg.get('role') == 'user' else "ASSISTANT"
            content = msg.get('content', '')
            history_text += f"{role}: {content}\n\n"

    full_prompt = f"""
SYSTEM:
{SYSTEM_PROMPT}

CONTEXT from RAG:
{context}
{history_text}
USER QUERY:
{query}

Now generate a complete ShuruKer business guidance response. If there is conversation history, maintain context and refer back to previous discussion when relevant.
    """

    response = client.models.generate_content(
        model=model,
        contents=full_prompt
    )
    return response.text

# -----------------------------------------------------
#                   MAIN WORKFLOW
# -----------------------------------------------------
if __name__ == "__main__":

    # 1) LOAD OR CREATE CHUNKS
    chunks = load_or_create_chunks()


    # 3) Init Pinecone
    index = init_pinecone_index()

    # 4) Upsert chunks (local embeddings for testing)
    if UPSERT_ONCE:
        upsert_chunks(index, chunks, use_gemini=False, batch_size=50)
    else:
        print("⏭️ Skipping upsert (already indexed)")


    # 5) TEST RAG QUERY
    user_query = "My clothing store is not attracting enough customers. What strategies can I use to increase foot traffic and sales?"

    context = retrieve_context(index, user_query, top_k=5, use_gemini=False)
    answer = shuruker_answer(user_query, context)

    print("\n\n=== SHURUKER RESPONSE ===\n")
    print(answer)
