// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const typingIndicator = document.getElementById('typingIndicator');
const conversationsList = document.getElementById('conversationsList');
const newChatBtn = document.getElementById('newChatBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const conversationSidebar = document.getElementById('conversationSidebar');

// Store conversation history and current conversation
let conversationHistory = [];
let currentUserToken = null;
let currentConversationId = null;
let conversations = [];

// Initialize Firebase Authentication
function initializeAuth() {
  // Firebase SDK should be loaded from chat.html
  if (typeof window.firebaseAuth === 'undefined') {
    console.error('Firebase Auth not loaded. Make sure to include Firebase SDK in chat.html');
    return;
  }

  window.onAuthStateChanged(window.firebaseAuth, (user) => {
    if (!user) {
      // User not logged in, redirect to login
      window.location.href = '/login';
    } else {
      // User is logged in, get ID token for API calls
      user.getIdToken().then((token) => {
        currentUserToken = token;
        // Load conversations after auth
        loadConversations();
      }).catch((error) => {
        console.error('Error getting token:', error);
      });
    }
  });
}

// Initialize auth on page load
window.chatInit = initializeAuth;
window.addEventListener('DOMContentLoaded', initializeAuth);

// Load all conversations
async function loadConversations() {
  try {
    const response = await fetch('/api/conversations');
    const data = await response.json();
    
    if (response.ok && data.conversations) {
      conversations = data.conversations;
      renderConversations();
    } else {
      console.error('Failed to load conversations');
      conversationsList.innerHTML = '<div class="no-conversations">No conversations yet. Start a new chat!</div>';
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    conversationsList.innerHTML = '<div class="no-conversations">No conversations yet. Start a new chat!</div>';
  }
}

// Render conversations list
function renderConversations() {
  if (conversations.length === 0) {
    conversationsList.innerHTML = '<div class="no-conversations">No conversations yet. Start a new chat!</div>';
    return;
  }
  
  conversationsList.innerHTML = conversations.map(conv => `
    <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" data-id="${conv.id}">
      <div class="conversation-header">
        <h4 class="conversation-title">${escapeHtml(conv.title)}</h4>
        <button class="delete-conversation-btn" data-id="${conv.id}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="conversation-meta">
        <span class="message-count">${conv.messageCount || 0} messages</span>
        <span class="conversation-time">${formatTimestamp(conv.updatedAt)}</span>
      </div>
    </div>
  `).join('');
  
  // Add click listeners
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-conversation-btn')) {
        loadConversation(item.dataset.id);
      }
    });
  });
  
  // Add delete listeners
  document.querySelectorAll('.delete-conversation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(btn.dataset.id);
    });
  });
}

// Load a specific conversation
async function loadConversation(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await response.json();
    
    if (response.ok && data.messages) {
      currentConversationId = conversationId;
      conversationHistory = [];
      
      // Clear chat
      chatMessages.innerHTML = '';
      
      // Display all messages
      data.messages.forEach(msg => {
        addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false);
        conversationHistory.push({ role: msg.role, content: msg.content });
      });
      
      // Update UI
      renderConversations();
      updateContextBadge();
      scrollToBottom();
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
}

// Create new conversation
async function createNewConversation(firstMessage = null) {
  try {
    const title = firstMessage ? firstMessage.substring(0, 50) : 'New Chat';
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    
    const data = await response.json();
    
    if (response.ok && data.conversationId) {
      currentConversationId = data.conversationId;
      conversationHistory = [];
      chatMessages.innerHTML = '';
      
      // Add welcome message
      addWelcomeMessage();
      
      // Reload conversations list
      await loadConversations();
      return data.conversationId;
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
  }
  return null;
}

// Delete conversation
async function deleteConversation(conversationId) {
  if (!confirm('Are you sure you want to delete this conversation?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      // If deleting current conversation, create new one
      if (conversationId === currentConversationId) {
        currentConversationId = null;
        conversationHistory = [];
        chatMessages.innerHTML = '';
        addWelcomeMessage();
      }
      
      // Reload conversations
      await loadConversations();
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

// New chat button handler
newChatBtn.addEventListener('click', async () => {
  await createNewConversation();
});

// Sidebar toggle
sidebarToggle.addEventListener('click', () => {
  conversationSidebar.classList.toggle('collapsed');
});

// Quick question function
function askQuestion(question) {
  userInput.value = question;
  userInput.focus();
  // Auto-submit after a brief delay for better UX
  setTimeout(() => {
    chatForm.dispatchEvent(new Event('submit'));
  }, 300);
}

// Get current time formatted
function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Send message on form submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const query = userInput.value.trim();
  if (!query) return;

  // Create new conversation if none exists
  if (!currentConversationId) {
    await createNewConversation(query);
  }

  // Add user message to chat
  addMessage(query, 'user');
  
  // Add to conversation history
  conversationHistory.push({ role: 'user', content: query });
  
  // Clear input
  userInput.value = '';
  
  // Show typing indicator
  typingIndicator.style.display = 'flex';

  try {
    // Call API with conversation history
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: query,
        history: conversationHistory,
        conversationId: currentConversationId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if unauthorized (token expired)
      if (response.status === 401) {
        addMessage('Your session has expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        addMessage(`Error: ${data.error || 'Failed to get response'}`, 'error');
      }
    } else {
      // Add bot response to chat
      addMessage(data.answer, 'bot');
      // Add to conversation history
      conversationHistory.push({ role: 'assistant', content: data.answer });
      
      // Update context badge
      updateContextBadge();
      
      // Reload conversations to update message count
      loadConversations();
    }
  } catch (error) {
    console.error('Error:', error);
    addMessage('Sorry, I encountered an error processing your request. Please try again.', 'error');
  } finally {
    // Hide typing indicator
    typingIndicator.style.display = 'none';
    userInput.focus();
  }
});

// Update context badge to show conversation length
function updateContextBadge() {
  const contextBadge = document.getElementById('contextBadge');
  const contextCount = document.getElementById('contextCount');
  
  if (conversationHistory.length > 0) {
    contextBadge.style.display = 'flex';
    const msgCount = Math.floor(conversationHistory.length / 2); // User-bot pairs
    contextCount.textContent = `${msgCount} ${msgCount === 1 ? 'exchange' : 'exchanges'}`;
  }
}

// Add message to chat
function addMessage(text, sender, shouldScroll = true) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  // Add avatar for bot messages
  if (sender === 'bot' || sender === 'error') {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = '<div class="avatar">S</div>';
    messageDiv.appendChild(avatarDiv);
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  
  // Format text with line breaks, basic markdown, and clickable links
  const formattedText = text
    // Markdown links: [text](/path) or [text](https://...)
    .replace(/\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Plain internal paths like /freelancers/Marketing%20Consultant
    .replace(/(^|\s)(\/(?:freelancers|register-freelancer)(?:\/[\w%\- ]+)*)/g, (match, prefix, path) => {
      if (path.startsWith('/freelancers/')) {
        const rawCategory = path.split('/').pop() || 'specialists';
        let categoryLabel = rawCategory;
        try {
          categoryLabel = decodeURIComponent(rawCategory);
        } catch (e) {
          categoryLabel = rawCategory;
        }
        return `${prefix}<a href="${path}">Click here to view ${categoryLabel} specialists</a>`;
      }

      if (path === '/register-freelancer') {
        return `${prefix}<a href="${path}">Click here to register as a freelancer</a>`;
      }

      return `${prefix}<a href="${path}">Click here</a>`;
    })
    // Plain full URLs
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  
  bubbleDiv.innerHTML = formattedText;
  contentDiv.appendChild(bubbleDiv);
  
  // Add timestamp
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = getTimeString();
  contentDiv.appendChild(timeDiv);
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom with smooth animation
  if (shouldScroll) {
    scrollToBottom();
  }
}

// Add welcome message
function addWelcomeMessage() {
  chatMessages.innerHTML = `
    <div class="message bot-message welcome-message">
      <div class="message-avatar">
        <div class="avatar">S</div>
      </div>
      <div class="message-content">
        <div class="message-bubble">
          <div class="welcome-header">
            <h3>👋 Welcome to ShurukerAi!</h3>
          </div>
          <p>I'm your AI-powered business assistant, specialized in helping Pakistani entrepreneurs launch and grow their businesses.</p>
          
          <div class="capabilities-grid">
            <div class="capability-item">
              <span class="capability-icon">💡</span>
              <span>Idea Validation</span>
            </div>
            <div class="capability-item">
              <span class="capability-icon">📊</span>
              <span>Market Research</span>
            </div>
            <div class="capability-item">
              <span class="capability-icon">🗺️</span>
              <span>Launch Roadmap</span>
            </div>
            <div class="capability-item">
              <span class="capability-icon">💰</span>
              <span>Budget Planning</span>
            </div>
            <div class="capability-item">
              <span class="capability-icon">📝</span>
              <span>Business Plans</span>
            </div>
            <div class="capability-item">
              <span class="capability-icon">⚖️</span>
              <span>Legal Guidance</span>
            </div>
          </div>
          
          <div class="quick-questions">
            <p class="quick-intro">💬 Try these quick questions:</p>
            <button class="quick-btn" onclick="askQuestion('How do I register a business in Pakistan?')">
              <span>🏢</span> How do I register a business in Pakistan?
            </button>
            <button class="quick-btn" onclick="askQuestion('What licenses do I need to start an e-commerce store?')">
              <span>📋</span> What licenses do I need for e-commerce?
            </button>
            <button class="quick-btn" onclick="askQuestion('How much budget do I need to start a small retail shop?')">
              <span>💰</span> Budget for retail shop?
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  
  const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

// Scroll to bottom of chat
function scrollToBottom() {
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

// Focus input on load
userInput.focus();

// Make askQuestion available globally
window.askQuestion = askQuestion;
