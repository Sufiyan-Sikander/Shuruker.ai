from flask import Flask, request, redirect, url_for, jsonify, session, send_from_directory
from flask_cors import CORS
import os
import json
import shutil
from functools import wraps
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth, firestore, storage
from datetime import datetime
import threading
from werkzeug.utils import secure_filename
from urllib.parse import quote

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')

# Enable CORS for frontend (Vercel and localhost)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://shurukerai.vercel.app",
            os.environ.get('FRONTEND_URL', '').rstrip('/')
        ],
        "allow_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "supports_credentials": True
    }
})


def frontend_redirect(path=''):
    """Redirect page requests to the React frontend."""
    target = f"{FRONTEND_URL}{path or '/'}"
    if request.query_string:
        target = f"{target}?{request.query_string.decode('utf-8')}"
    return redirect(target)

def resolve_storage_bucket_candidates(key_path='firebase-key.json'):
    """Resolve possible Firebase Storage bucket names from env or service account project id."""
    candidates = []
    env_bucket = os.environ.get('FIREBASE_STORAGE_BUCKET', '').strip()
    if env_bucket.startswith('gs://'):
        env_bucket = env_bucket[5:]
    env_bucket = env_bucket.strip('/')
    if env_bucket:
        candidates.append(env_bucket)

    try:
        if os.path.exists(key_path):
            with open(key_path, 'r', encoding='utf-8') as f:
                key_data = json.load(f)
            project_id = (key_data.get('project_id') or '').strip()
            if project_id:
                candidates.extend([
                    f"{project_id}.appspot.com",
                    f"{project_id}.firebasestorage.app",
                ])
    except Exception as e:
        print(f"⚠️ Could not resolve storage bucket from {key_path}: {e}")

    # Preserve order, remove duplicates and empty values
    return [name for i, name in enumerate(candidates) if name and name not in candidates[:i]]

def resolve_storage_bucket_name(key_path='firebase-key.json'):
    """Primary bucket candidate used for Firebase app initialization."""
    candidates = resolve_storage_bucket_candidates(key_path)
    return candidates[0] if candidates else None

def save_portfolio_pdf_locally(file_obj, uid):
    """Save uploaded PDF to local filesystem as a free fallback."""
    original_name = secure_filename(file_obj.filename or 'portfolio.pdf')
    if not original_name.lower().endswith('.pdf'):
        original_name = f"{original_name}.pdf"

    file_dir = os.path.join('uploads', 'freelancers', secure_filename(uid or 'anonymous'))
    os.makedirs(file_dir, exist_ok=True)

    file_path = os.path.join(file_dir, original_name)
    file_obj.stream.seek(0)
    file_obj.save(file_path)

    relative_url = file_path.replace('\\', '/')
    return f"/{relative_url}"

# Initialize Firebase Admin (for backend token verification)
db = None
storage_bucket = None
try:
    # Download your service account key from Firebase Console
    # Place it in the root directory as firebase-key.json
    if os.path.exists('firebase-key.json'):
        cred = credentials.Certificate('firebase-key.json')
        bucket_name = resolve_storage_bucket_name('firebase-key.json')

        if not firebase_admin._apps:
            init_options = {'storageBucket': bucket_name} if bucket_name else None
            firebase_admin.initialize_app(cred, init_options)

        db = firestore.client()

        # Initialize storage bucket without breaking Firestore setup
        if bucket_name:
            storage_bucket = storage.bucket(bucket_name)
            print(f"Firebase Admin, Firestore, and Storage initialized successfully (bucket: {bucket_name})")
        else:
            print("Firebase Admin and Firestore initialized. Set FIREBASE_STORAGE_BUCKET to enable Storage uploads.")
except Exception as e:
    print(f"Firebase Admin initialization: {e}")

# Warmup function to preload models on startup
def warmup_models():
    """Preload embedding model and initialize Pinecone on server startup."""
    try:
        print("🔥 Warming up embedding model...")
        from main import local_model, init_pinecone_index
        
        # Warm up the embedding model with a dummy encode
        dummy = local_model.encode(["warmup"])
        print("✅ Embedding model warmed up ")
        
        # Initialize Pinecone connection
        index = init_pinecone_index()
        print("✅ Pinecone index initialized")
    except Exception as e:
        print(f"⚠️ Warmup error (non-critical): {e}")

# Run warmup in a background thread so server starts quickly
@app.before_request
def startup():
    """Run warmup once on first request."""
    if not hasattr(app, 'warmed_up'):
        app.warmed_up = True
        threading.Thread(target=warmup_models, daemon=True).start()

def login_required(f):
    """Decorator to check if user is authenticated"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user session exists
        if 'uid' not in session:
            next_url = request.full_path if request.query_string else request.path
            return redirect(url_for('login', next=next_url))
        return f(*args, **kwargs)
    return decorated_function

def get_freelancer_profile(uid):
    """Fetch freelancer profile by UID."""
    if not db or not uid:
        return None
    doc = db.collection('freelancers').document(uid).get()
    if doc.exists:
        return doc.to_dict() or {}
    return None

def get_user_profile(uid):
    """Fetch user profile document by UID."""
    if not db or not uid:
        return {}
    doc = db.collection('users').document(uid).get()
    if not doc.exists:
        return {}
    return doc.to_dict() or {}

def is_approved_freelancer(uid):
    """Check if uid belongs to approved freelancer profile."""
    freelancer = get_freelancer_profile(uid)
    return bool(freelancer and freelancer.get('isApproved', False))

def ensure_dm_participant(thread_data, uid):
    """Check if current uid belongs to a DM thread participants list."""
    return uid in (thread_data.get('participants', []) or [])

def get_user_landing_path(uid):
    """Determine default post-login route for standard auth flow."""
    return '/chat'

@app.route('/')
def index():
    return frontend_redirect('/')

@app.route('/health')
def health():
    """Health check endpoint to verify backend is running."""
    return jsonify({"status": "ok", "backend": "running"})

@app.route('/login')
def login():
    """Login/Sign up page."""
    return frontend_redirect('/login')

@app.route('/freelancer-login')
def freelancer_login():
    """Dedicated freelancer login page."""
    return frontend_redirect('/freelancer-login')

@app.route('/chat')
@login_required
def chat():
    """Chat page with chatbot interface."""
    return frontend_redirect('/chat')

@app.route('/client-messages')
@login_required
def client_messages():
    """Client messaging page to contact freelancers."""
    return frontend_redirect('/client-messages')

@app.route('/freelancer-inbox')
@login_required
def freelancer_inbox():
    """Freelancer inbox page for client conversations."""
    uid = session.get('uid')
    if not is_approved_freelancer(uid):
        return redirect(url_for('freelancer_login'))
    return frontend_redirect('/freelancer-inbox')

@app.route('/learn')
def learn():
    """Learn more page opened in a new tab from the hero CTA."""
    return frontend_redirect('/learn')

@app.route('/explore')
def explore():
    """Explore trends and probability helper page."""
    return frontend_redirect('/explore')

@app.route('/data/<path:filename>')
def serve_data(filename):
    """Serve data files."""
    return send_from_directory('data', filename)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    """Serve locally stored uploaded files."""
    return send_from_directory('uploads', filename)

@app.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify Firebase ID token and create session"""
    try:
        data = request.get_json() or {}
        id_token = data.get('idToken')
        
        if not id_token:
            return jsonify({"error": "No token provided"}), 400
        
        # Verify token with small clock skew tolerance
        decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=10)
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Store user info in session
        session['uid'] = uid
        session['email'] = email
        
        # Save/Update user info in Firestore
        if db:
            user_ref = db.collection('users').document(uid)
            user_ref.set({
                'email': email,
                'displayName': decoded_token.get('name', ''),
                'lastLogin': firestore.SERVER_TIMESTAMP,
                'createdAt': firestore.SERVER_TIMESTAMP
            }, merge=True)  # merge=True will update existing fields or create new document
        
        return jsonify({"success": True, "uid": uid, "redirectTo": get_user_landing_path(uid)})
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({"error": "Invalid token"}), 401

@app.route('/api/me', methods=['GET'])
@login_required
def api_me():
    """Get current authenticated user role/status for frontend routing."""
    uid = session.get('uid')
    email = session.get('email', '')
    freelancer = get_freelancer_profile(uid) or {}

    return jsonify({
        'uid': uid,
        'email': email,
        'isFreelancer': bool(freelancer),
        'isApprovedFreelancer': freelancer.get('isApproved', False),
        'freelancerName': freelancer.get('fullName', ''),
        'freelancerCategory': freelancer.get('category', '')
    })

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    return frontend_redirect('/')

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    """API endpoint for chatbot messages."""
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    history = data.get('history', [])
    conversation_id = data.get('conversationId')

    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    try:
        # Import heavy functions from main.py when needed
        from main import shuruker_answer, retrieve_context, init_pinecone_index
        
        # Initialize pinecone index
        index = init_pinecone_index()
        
        # Retrieve context from RAG (reduced to 3 chunks for 40% faster response)
        context = retrieve_context(index, query, top_k=3, use_gemini=False)
        
        # Get answer from LLM with conversation history
        answer = shuruker_answer(query, context, history)
        
        # Save messages to Firestore if conversation_id is provided
        if db and conversation_id:
            uid = session.get('uid')
            conversation_ref = db.collection('users').document(uid).collection('conversations').document(conversation_id)
            
            # Update conversation timestamp
            conversation_ref.update({
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'messageCount': firestore.Increment(2)
            })
            
            # Save user message
            conversation_ref.collection('messages').add({
                'role': 'user',
                'content': query,
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            
            # Save assistant message
            conversation_ref.collection('messages').add({
                'role': 'assistant',
                'content': str(answer),
                'timestamp': firestore.SERVER_TIMESTAMP
            })
        
        return jsonify({"answer": str(answer)})
    except Exception as e:
        print(f"Error in chat API: {str(e)}")
        return jsonify({"error": "Failed to process your query", "details": str(e)}), 500

# Conversation management endpoints
@app.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    """Get all conversations for the current user."""
    try:
        uid = session.get('uid')
        conversations_ref = db.collection('users').document(uid).collection('conversations')
        conversations = conversations_ref.order_by('updatedAt', direction=firestore.Query.DESCENDING).limit(50).stream()
        
        result = []
        for conv in conversations:
            conv_data = conv.to_dict()
            result.append({
                'id': conv.id,
                'title': conv_data.get('title', 'New Chat'),
                'createdAt': conv_data.get('createdAt'),
                'updatedAt': conv_data.get('updatedAt'),
                'messageCount': conv_data.get('messageCount', 0)
            })
        
        return jsonify({"conversations": result})
    except Exception as e:
        print(f"Error fetching conversations: {str(e)}")
        return jsonify({"error": "Failed to fetch conversations"}), 500

@app.route('/api/conversations/create', methods=['POST'])
@login_required
def create_conversation():
    """Create a new conversation."""
    try:
        data = request.get_json() or {}
        title = data.get('title', 'New Chat')
        uid = session.get('uid')
        
        # Create new conversation
        conversation_ref = db.collection('users').document(uid).collection('conversations').document()
        conversation_ref.set({
            'title': title,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'messageCount': 0
        })
        
        return jsonify({"success": True, "conversationId": conversation_ref.id})
    except Exception as e:
        print(f"Error creating conversation: {str(e)}")
        return jsonify({"error": "Failed to create conversation"}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
@login_required
def get_messages(conversation_id):
    """Get all messages for a specific conversation."""
    try:
        uid = session.get('uid')
        messages_ref = db.collection('users').document(uid).collection('conversations').document(conversation_id).collection('messages')
        messages = messages_ref.order_by('timestamp').stream()
        
        result = []
        for msg in messages:
            msg_data = msg.to_dict()
            result.append({
                'id': msg.id,
                'role': msg_data.get('role'),
                'content': msg_data.get('content'),
                'timestamp': msg_data.get('timestamp')
            })
        
        return jsonify({"messages": result})
    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return jsonify({"error": "Failed to fetch messages"}), 500

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    """Delete a conversation and all its messages."""
    try:
        uid = session.get('uid')
        conversation_ref = db.collection('users').document(uid).collection('conversations').document(conversation_id)
        
        # Delete all messages first
        messages = conversation_ref.collection('messages').stream()
        for msg in messages:
            msg.reference.delete()
        
        # Delete the conversation
        conversation_ref.delete()
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting conversation: {str(e)}")
        return jsonify({"error": "Failed to delete conversation"}), 500

# ==================== FREELANCER ROUTES ====================

@app.route('/register-freelancer')
@login_required
def register_freelancer():
    """Register freelancer form page."""
    return frontend_redirect('/register-freelancer')

@app.route('/freelancers')
def freelancers_listing():
    """Freelancers listing page."""
    return frontend_redirect('/freelancers')

@app.route('/freelancers/<category>')
def freelancers_by_category(category):
    """Freelancers by category page."""
    return frontend_redirect(f'/freelancers/{quote(category, safe="")}')

@app.route('/api/register-freelancer', methods=['POST'])
@login_required
def api_register_freelancer():
    """API endpoint for freelancer registration with PDF upload."""
    global storage_bucket
    try:
        # Get form data
        full_name = request.form.get('fullName', '').strip()
        email = request.form.get('email', '').strip()
        category = request.form.get('category', '').strip()
        bio = request.form.get('bio', '').strip()
        portfolio_link = request.form.get('portfolioLink', '').strip()
        uid = session.get('uid')
        session_email = session.get('email', '').strip()

        if not uid:
            return jsonify({"error": "Authentication required"}), 401

        if session_email:
            email = session_email
        
        # Validate required fields
        if not all([full_name, email, category, bio]):
            return jsonify({"error": "Missing required fields"}), 400
        
        if len(bio) < 50:
            return jsonify({"error": "Bio must be at least 50 characters"}), 400
        
        # Check if file was uploaded
        if 'portfolioFile' not in request.files:
            return jsonify({"error": "Portfolio PDF not uploaded"}), 400
        
        file = request.files['portfolioFile']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.pdf'):
            return jsonify({"error": "File must be a PDF"}), 400
        
        try:
            # Upload PDF to Firebase Cloud Storage
            if not storage_bucket:
                bucket_name = resolve_storage_bucket_name('firebase-key.json')
                if bucket_name:
                    storage_bucket = storage.bucket(bucket_name)

            if not storage_bucket:
                print("⚠️ Firebase Storage not configured. Saving PDF locally.")
                portfolio_pdf_url = save_portfolio_pdf_locally(file, uid)
                print(f"✅ PDF saved locally: {portfolio_pdf_url}")
            else:
                file_content = file.read()
                file_path = f"freelancers/{uid}/{file.filename}"
                uploaded = False

                # Try current bucket first, then fallback candidates for 404 bucket-not-found issues
                candidate_names = [storage_bucket.name] + resolve_storage_bucket_candidates('firebase-key.json')
                candidate_names = [name for i, name in enumerate(candidate_names) if name and name not in candidate_names[:i]]

                for candidate_name in candidate_names:
                    try:
                        candidate_bucket = storage.bucket(candidate_name)
                        blob = candidate_bucket.blob(file_path)
                        blob.upload_from_string(
                            file_content,
                            content_type='application/pdf'
                        )
                        storage_bucket = candidate_bucket
                        uploaded = True
                        print(f"✅ PDF uploaded: {file_path} (bucket: {candidate_name})")
                        break
                    except Exception as candidate_error:
                        error_text = str(candidate_error)
                        if (
                            'The specified bucket does not exist' in error_text
                            or 'status code' in error_text and '404' in error_text
                        ):
                            print(f"⚠️ Bucket not found: {candidate_name}. Trying next candidate...")
                            continue
                        raise

                if not uploaded:
                    raise Exception("No valid Firebase Storage bucket found. Set FIREBASE_STORAGE_BUCKET to the exact bucket name from Firebase Console.")
                
                # Generate public URL for the PDF
                portfolio_pdf_url = f"https://firebasestorage.googleapis.com/v0/b/{storage_bucket.name}/o/freelancers%2F{uid}%2F{file.filename}?alt=media"
            
        except Exception as storage_error:
            print(f"⚠️ Storage upload error: {str(storage_error)}")
            # Free fallback: save locally if cloud upload fails
            try:
                portfolio_pdf_url = save_portfolio_pdf_locally(file, uid)
                print(f"✅ PDF saved locally after storage failure: {portfolio_pdf_url}")
            except Exception as local_save_error:
                print(f"⚠️ Local fallback upload failed: {str(local_save_error)}")
                portfolio_pdf_url = ""
        
        # Save freelancer data to Firestore
        if db:
            freelancer_ref = db.collection('freelancers').document(uid)
            freelancer_ref.set({
                'fullName': full_name,
                'email': email,
                'category': category,
                'bio': bio,
                'portfolioLink': portfolio_link,
                'portfolioPdfUrl': portfolio_pdf_url,
                'rating': 0,
                'isApproved': False,  # Manual approval for MVP
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })

            db.collection('users').document(uid).set({
                'email': email,
                'role': 'freelancer',
                'isFreelancer': True,
                'freelancerStatus': 'pending',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"✅ Freelancer registered: {full_name} ({email}) - {category}")
        else:
            print("⚠️ Database not initialized, but registration data would be:")
            print(f"   {full_name} ({email}) - {category}")
        
        return jsonify({"success": True, "message": "Registration successful"}), 201
        
    except Exception as e:
        print(f"❌ Error registering freelancer: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to register: {str(e)}"}), 500

@app.route('/api/freelancers', methods=['GET'])
def api_get_freelancers():
    """Get all approved freelancers (optional filter by category)."""
    try:
        category = request.args.get('category', '')
        
        # Only fetch approved freelancers
        query = db.collection('freelancers').where('isApproved', '==', True)
        
        if category:
            query = query.where('category', '==', category)
        
        freelancers = query.stream()
        
        result = []
        for freelancer in freelancers:
            data = freelancer.to_dict()
            result.append({
                'id': freelancer.id,
                'fullName': data.get('fullName'),
                'category': data.get('category'),
                'bio': data.get('bio'),
                'portfolioLink': data.get('portfolioLink'),
                'portfolioPdfUrl': data.get('portfolioPdfUrl'),
                'rating': data.get('rating', 0),
                'createdAt': data.get('createdAt')
            })
        
        return jsonify({"freelancers": result})
    except Exception as e:
        print(f"Error fetching freelancers: {str(e)}")
        return jsonify({"error": "Failed to fetch freelancers"}), 500

# ==================== DIRECT MESSAGE ROUTES ====================

@app.route('/api/dm/start', methods=['POST'])
@login_required
def api_start_dm():
    """Start or fetch a direct-message thread between client and freelancer."""
    try:
        if not db:
            return jsonify({'error': 'Database is not configured'}), 500

        data = request.get_json() or {}
        freelancer_uid = (data.get('freelancerUid') or '').strip()
        client_uid = session.get('uid')

        if not freelancer_uid:
            return jsonify({'error': 'freelancerUid is required'}), 400
        if freelancer_uid == client_uid:
            return jsonify({'error': 'You cannot message yourself'}), 400
        if not is_approved_freelancer(freelancer_uid):
            return jsonify({'error': 'Freelancer is not approved for messaging'}), 404

        existing = db.collection('dm_threads')\
            .where('clientUid', '==', client_uid)\
            .where('freelancerUid', '==', freelancer_uid)\
            .limit(1).stream()
        existing_thread = next(existing, None)

        if existing_thread:
            return jsonify({'threadId': existing_thread.id, 'created': False})

        freelancer_profile = get_freelancer_profile(freelancer_uid) or {}
        client_profile = get_user_profile(client_uid)

        client_name = client_profile.get('displayName') or session.get('email', 'Client')
        now = firestore.SERVER_TIMESTAMP
        thread_ref = db.collection('dm_threads').document()
        thread_ref.set({
            'participants': [client_uid, freelancer_uid],
            'clientUid': client_uid,
            'freelancerUid': freelancer_uid,
            'clientName': client_name,
            'freelancerName': freelancer_profile.get('fullName', 'Freelancer'),
            'freelancerCategory': freelancer_profile.get('category', ''),
            'lastMessage': '',
            'lastMessageAt': now,
            'unreadCount': {
                client_uid: 0,
                freelancer_uid: 0
            },
            'createdAt': now,
            'updatedAt': now
        })

        return jsonify({'threadId': thread_ref.id, 'created': True})
    except Exception as e:
        print(f"Error starting DM: {str(e)}")
        return jsonify({'error': 'Failed to start conversation'}), 500

@app.route('/api/dm/threads', methods=['GET'])
@login_required
def api_dm_threads():
    """List DM threads for current user."""
    try:
        if not db:
            return jsonify({'error': 'Database is not configured'}), 500

        uid = session.get('uid')
        docs = db.collection('dm_threads').where('participants', 'array_contains', uid).stream()

        result = []
        for thread in docs:
            data = thread.to_dict() or {}
            unread_map = data.get('unreadCount', {})
            is_freelancer_view = uid == data.get('freelancerUid')
            other_name = data.get('clientName', 'Client') if is_freelancer_view else data.get('freelancerName', 'Freelancer')

            result.append({
                'id': thread.id,
                'clientUid': data.get('clientUid'),
                'freelancerUid': data.get('freelancerUid'),
                'otherName': other_name,
                'freelancerName': data.get('freelancerName', 'Freelancer'),
                'freelancerCategory': data.get('freelancerCategory', ''),
                'lastMessage': data.get('lastMessage', ''),
                'lastMessageAt': data.get('lastMessageAt'),
                'updatedAt': data.get('updatedAt'),
                'unreadCount': int(unread_map.get(uid, 0) or 0)
            })

        result.sort(key=lambda item: item.get('updatedAt') or item.get('lastMessageAt') or datetime.min, reverse=True)
        return jsonify({'threads': result})
    except Exception as e:
        print(f"Error listing DM threads: {str(e)}")
        return jsonify({'error': 'Failed to load conversations'}), 500

@app.route('/api/dm/threads/<thread_id>/messages', methods=['GET'])
@login_required
def api_dm_messages(thread_id):
    """Fetch all messages for one DM thread."""
    try:
        if not db:
            return jsonify({'error': 'Database is not configured'}), 500

        uid = session.get('uid')
        thread_ref = db.collection('dm_threads').document(thread_id)
        thread_doc = thread_ref.get()
        if not thread_doc.exists:
            return jsonify({'error': 'Thread not found'}), 404

        thread_data = thread_doc.to_dict() or {}
        if not ensure_dm_participant(thread_data, uid):
            return jsonify({'error': 'Unauthorized'}), 403

        docs = thread_ref.collection('messages').order_by('createdAt').stream()
        messages = []
        for msg in docs:
            data = msg.to_dict() or {}
            messages.append({
                'id': msg.id,
                'senderId': data.get('senderId'),
                'text': data.get('text', ''),
                'createdAt': data.get('createdAt')
            })

        return jsonify({'messages': messages})
    except Exception as e:
        print(f"Error fetching DM messages: {str(e)}")
        return jsonify({'error': 'Failed to load messages'}), 500

@app.route('/api/dm/threads/<thread_id>/messages', methods=['POST'])
@login_required
def api_send_dm_message(thread_id):
    """Send one direct message in selected thread."""
    try:
        if not db:
            return jsonify({'error': 'Database is not configured'}), 500

        uid = session.get('uid')
        payload = request.get_json() or {}
        text = (payload.get('text') or '').strip()

        if not text:
            return jsonify({'error': 'Message cannot be empty'}), 400
        if len(text) > 2000:
            return jsonify({'error': 'Message too long (max 2000 chars)'}), 400

        thread_ref = db.collection('dm_threads').document(thread_id)
        thread_doc = thread_ref.get()
        if not thread_doc.exists:
            return jsonify({'error': 'Thread not found'}), 404

        thread_data = thread_doc.to_dict() or {}
        if not ensure_dm_participant(thread_data, uid):
            return jsonify({'error': 'Unauthorized'}), 403

        participants = thread_data.get('participants', [])
        receiver_uid = next((participant for participant in participants if participant != uid), '')
        unread_map = thread_data.get('unreadCount', {})

        thread_ref.collection('messages').add({
            'senderId': uid,
            'text': text,
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        update_data = {
            'lastMessage': text,
            'lastMessageAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            f'unreadCount.{uid}': 0
        }

        if receiver_uid:
            update_data[f'unreadCount.{receiver_uid}'] = int(unread_map.get(receiver_uid, 0) or 0) + 1

        thread_ref.update(update_data)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error sending DM message: {str(e)}")
        return jsonify({'error': 'Failed to send message'}), 500

@app.route('/api/dm/threads/<thread_id>/seen', methods=['POST'])
@login_required
def api_mark_dm_seen(thread_id):
    """Mark current user unread as seen for thread."""
    try:
        if not db:
            return jsonify({'error': 'Database is not configured'}), 500

        uid = session.get('uid')
        thread_ref = db.collection('dm_threads').document(thread_id)
        thread_doc = thread_ref.get()
        if not thread_doc.exists:
            return jsonify({'error': 'Thread not found'}), 404

        thread_data = thread_doc.to_dict() or {}
        if not ensure_dm_participant(thread_data, uid):
            return jsonify({'error': 'Unauthorized'}), 403

        thread_ref.update({
            f'unreadCount.{uid}': 0,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error marking DM seen: {str(e)}")
        return jsonify({'error': 'Failed to update seen status'}), 500

# ==================== ADMIN ROUTES ====================

ADMIN_USERNAME = "shuruker"
ADMIN_PASSWORD = "Szabist@ai"
ADMIN_TOKEN_SECRET = "admin_secret_key_shuruker"

def verify_admin_token(token):
    """Verify admin token"""
    try:
        import jwt
        decoded = jwt.decode(token, ADMIN_TOKEN_SECRET, algorithms=["HS256"])
        return decoded.get('admin') == True
    except:
        return False

def generate_admin_token():
    """Generate admin token"""
    try:
        import jwt
        from datetime import datetime, timedelta
        token = jwt.encode(
            {'admin': True, 'exp': datetime.utcnow() + timedelta(hours=24)},
            ADMIN_TOKEN_SECRET,
            algorithm="HS256"
        )
        return token
    except:
        return None

@app.route('/admin')
def admin_dashboard():
    """Admin dashboard page."""
    return frontend_redirect('/admin')

@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    """Admin login endpoint."""
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            token = generate_admin_token()
            if token:
                return jsonify({"success": True, "token": token})
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/admin/freelancers', methods=['GET'])
def api_admin_freelancers():
    """Get all freelancer profiles for admin review and management."""
    try:
        # Verify admin token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401
        
        # Get freelancer profiles grouped by status
        profiles = []
        pending = 0
        approved = 0
        rejected = 0
        removed = 0
        
        if db:
            # Get all freelancers to check status
            all_freelancers = db.collection('freelancers').stream()
            
            for freelancer in all_freelancers:
                data = freelancer.to_dict()
                is_approved = data.get('isApproved', False)
                
                is_removed = data.get('isRemoved', False)

                if is_removed:
                    status = 'removed'
                    removed += 1
                elif is_approved:
                    status = 'approved'
                    approved += 1
                elif data.get('isRejected', False):
                    status = 'rejected'
                    rejected += 1
                else:
                    status = 'pending'
                    pending += 1

                profiles.append({
                    'id': freelancer.id,
                    'fullName': data.get('fullName'),
                    'email': data.get('email'),
                    'category': data.get('category'),
                    'bio': data.get('bio'),
                    'portfolioLink': data.get('portfolioLink'),
                    'portfolioPdfUrl': data.get('portfolioPdfUrl'),
                    'isApproved': is_approved,
                    'isRejected': data.get('isRejected', False),
                    'isRemoved': is_removed,
                    'status': status,
                    'createdAt': data.get('createdAt')
                })
        
        return jsonify({
            "freelancers": profiles,
            "stats": {
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "removed": removed
            }
        })
    except Exception as e:
        print(f"Error fetching admin freelancers: {str(e)}")
        return jsonify({"error": "Failed to fetch freelancers"}), 500

@app.route('/api/admin/freelancers/<freelancer_id>/approve', methods=['POST'])
def api_admin_approve(freelancer_id):
    """Approve a freelancer."""
    try:
        # Verify admin token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401
        
        if db:
            freelancer_ref = db.collection('freelancers').document(freelancer_id)
            freelancer_ref.update({
                'isApproved': True,
                'isRejected': False,
                'isRemoved': False,
                'approvedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            db.collection('users').document(freelancer_id).set({
                'role': 'freelancer',
                'isFreelancer': True,
                'freelancerStatus': 'approved',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"✅ Freelancer approved: {freelancer_id}")
        
        return jsonify({"success": True, "message": "Freelancer approved"})
    except Exception as e:
        print(f"Error approving freelancer: {str(e)}")
        return jsonify({"error": "Failed to approve"}), 500

@app.route('/api/admin/freelancers/<freelancer_id>/reject', methods=['POST'])
def api_admin_reject(freelancer_id):
    """Reject a freelancer."""
    try:
        # Verify admin token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401
        
        if db:
            freelancer_ref = db.collection('freelancers').document(freelancer_id)
            freelancer_ref.update({
                'isApproved': False,
                'isRejected': True,
                'isRemoved': False,
                'rejectedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            db.collection('users').document(freelancer_id).set({
                'role': 'freelancer',
                'isFreelancer': True,
                'freelancerStatus': 'rejected',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"❌ Freelancer rejected: {freelancer_id}")
        
        return jsonify({"success": True, "message": "Freelancer rejected"})
    except Exception as e:
        print(f"Error rejecting freelancer: {str(e)}")
        return jsonify({"error": "Failed to reject"}), 500

@app.route('/api/admin/freelancers/<freelancer_id>/soft-remove', methods=['POST'])
def api_admin_soft_remove(freelancer_id):
    """Soft remove a freelancer profile while keeping data restorable."""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401

        if db:
            freelancer_ref = db.collection('freelancers').document(freelancer_id)
            freelancer_ref.update({
                'isApproved': False,
                'isRejected': False,
                'isRemoved': True,
                'removedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            db.collection('users').document(freelancer_id).set({
                'role': 'user',
                'isFreelancer': False,
                'freelancerStatus': 'removed',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"🟡 Freelancer soft removed: {freelancer_id}")

        return jsonify({"success": True, "message": "Freelancer soft removed"})
    except Exception as e:
        print(f"Error soft removing freelancer: {str(e)}")
        return jsonify({"error": "Failed to soft remove"}), 500

@app.route('/api/admin/freelancers/<freelancer_id>/restore', methods=['POST'])
def api_admin_restore(freelancer_id):
    """Restore a soft-removed freelancer profile back to pending review."""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401

        if db:
            freelancer_ref = db.collection('freelancers').document(freelancer_id)
            freelancer_ref.update({
                'isApproved': False,
                'isRejected': False,
                'isRemoved': False,
                'restoredAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            db.collection('users').document(freelancer_id).set({
                'role': 'freelancer',
                'isFreelancer': True,
                'freelancerStatus': 'pending',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"♻️ Freelancer restored to pending: {freelancer_id}")

        return jsonify({"success": True, "message": "Freelancer restored"})
    except Exception as e:
        print(f"Error restoring freelancer: {str(e)}")
        return jsonify({"error": "Failed to restore"}), 500

@app.route('/api/admin/freelancers/<freelancer_id>', methods=['DELETE'])
def api_admin_delete_freelancer(freelancer_id):
    """Permanently delete freelancer profile and related uploaded assets."""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header.split('Bearer ')[1]
        if not verify_admin_token(token):
            return jsonify({"error": "Invalid token"}), 401

        if db:
            # Delete related direct-message threads and messages
            thread_query = db.collection('dm_threads').where('freelancerUid', '==', freelancer_id).stream()
            for thread in thread_query:
                for message in thread.reference.collection('messages').stream():
                    message.reference.delete()
                thread.reference.delete()

            # Delete freelancer profile document
            db.collection('freelancers').document(freelancer_id).delete()

            # Revert user role flags if user doc exists
            db.collection('users').document(freelancer_id).set({
                'role': 'user',
                'isFreelancer': False,
                'freelancerStatus': 'deleted',
                'updatedAt': firestore.SERVER_TIMESTAMP
            }, merge=True)

        # Delete local uploaded files if present
        local_dir = os.path.join('uploads', 'freelancers', secure_filename(freelancer_id))
        if os.path.isdir(local_dir):
            shutil.rmtree(local_dir, ignore_errors=True)

        # Delete cloud storage files if storage bucket is configured
        if storage_bucket:
            prefix = f"freelancers/{freelancer_id}/"
            for blob in storage_bucket.list_blobs(prefix=prefix):
                blob.delete()

        print(f"🗑️ Freelancer permanently deleted: {freelancer_id}")
        return jsonify({"success": True, "message": "Freelancer permanently deleted"})
    except Exception as e:
        print(f"Error permanently deleting freelancer: {str(e)}")
        return jsonify({"error": "Failed to permanently delete freelancer"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    is_dev = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=is_dev, use_reloader=False)
