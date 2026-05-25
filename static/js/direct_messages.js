const threadsContainer = document.getElementById('threads');
const messagesContainer = document.getElementById('messages');
const chatTitle = document.getElementById('chatTitle');
const chatSub = document.getElementById('chatSub');
const composer = document.getElementById('composer');
const messageInput = document.getElementById('messageInput');
const pageRoot = document.querySelector('main[data-dm-role]');
const pageRole = pageRoot?.dataset?.dmRole || 'client';

let currentUser = null;
let activeThreadId = null;
let threads = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function tsToDate(ts) {
  if (!ts) return null;
  if (ts._seconds) return new Date(ts._seconds * 1000);
  const parsed = new Date(ts);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(ts) {
  const d = tsToDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function loadMe() {
  const response = await fetch('/api/me');
  if (!response.ok) throw new Error('Failed to load user info');
  currentUser = await response.json();
}

async function maybeStartThreadForClient() {
  if (pageRole !== 'client') return null;

  const params = new URLSearchParams(window.location.search);
  const freelancerUid = params.get('freelancer');
  if (!freelancerUid) return null;

  const response = await fetch('/api/dm/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ freelancerUid })
  });
  const data = await response.json();

  if (!response.ok) {
    alert(data.error || 'Could not start conversation.');
    return null;
  }

  window.history.replaceState({}, '', '/client-messages');
  return data.threadId;
}

function renderThreads() {
  if (!threads.length) {
    threadsContainer.innerHTML = '<div class="empty">No conversations found yet.</div>';
    return;
  }

  threadsContainer.innerHTML = threads.map(thread => {
    const activeClass = thread.id === activeThreadId ? 'active' : '';
    const unread = thread.unreadCount > 0 ? `<span class="unread">${thread.unreadCount}</span>` : '';
    return `
      <div class="thread ${activeClass}" data-id="${thread.id}">
        <div class="thread-top">
          <div class="thread-name">${escapeHtml(thread.otherName || 'Conversation')}</div>
          <div class="thread-time">${formatTime(thread.updatedAt || thread.lastMessageAt)}</div>
        </div>
        <div class="thread-bottom">
          <div class="thread-last">${escapeHtml(thread.lastMessage || 'No messages yet')}</div>
          ${unread}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.thread').forEach(item => {
    item.addEventListener('click', () => openThread(item.dataset.id));
  });
}

async function loadThreads() {
  const response = await fetch('/api/dm/threads');
  const data = await response.json();

  if (!response.ok) {
    threadsContainer.innerHTML = `<div class="empty">${escapeHtml(data.error || 'Failed to load conversations')}</div>`;
    return;
  }

  threads = data.threads || [];
  renderThreads();
}

function renderMessages(messages) {
  if (!messages.length) {
    messagesContainer.innerHTML = '<div class="empty">No messages yet. Start the conversation.</div>';
    return;
  }

  messagesContainer.innerHTML = messages.map(msg => {
    const mine = msg.senderId === currentUser.uid;
    const rowClass = mine ? 'me' : 'other';
    return `
      <div class="row ${rowClass}">
        <div>
          <div class="bubble">${escapeHtml(msg.text)}</div>
          <div class="msg-time">${formatTime(msg.createdAt)}</div>
        </div>
      </div>
    `;
  }).join('');

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function openThread(threadId) {
  activeThreadId = threadId;
  renderThreads();

  const activeThread = threads.find(t => t.id === threadId);
  chatTitle.textContent = activeThread?.otherName || 'Conversation';
  chatSub.textContent = pageRole === 'freelancer' ? 'Client conversation' : (activeThread?.freelancerCategory || 'Freelancer conversation');
  composer.style.display = 'flex';

  const response = await fetch(`/api/dm/threads/${threadId}/messages`);
  const data = await response.json();
  if (!response.ok) {
    messagesContainer.innerHTML = `<div class="empty">${escapeHtml(data.error || 'Failed to load messages')}</div>`;
    return;
  }

  renderMessages(data.messages || []);
  await fetch(`/api/dm/threads/${threadId}/seen`, { method: 'POST' });
  await loadThreads();
}

async function sendMessage(text) {
  if (!activeThreadId || !text.trim()) return;

  const response = await fetch(`/api/dm/threads/${activeThreadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() })
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Failed to send message');
    return;
  }

  messageInput.value = '';
  await openThread(activeThreadId);
}

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  await sendMessage(messageInput.value);
});

async function init() {
  try {
    await loadMe();

    if (pageRole === 'freelancer' && !currentUser.isApprovedFreelancer) {
      window.location.href = '/freelancer-login';
      return;
    }

    const startedThreadId = await maybeStartThreadForClient();
    await loadThreads();

    if (startedThreadId) {
      await openThread(startedThreadId);
      return;
    }

    if (threads.length) {
      await openThread(threads[0].id);
    }
  } catch (error) {
    console.error(error);
    threadsContainer.innerHTML = '<div class="empty">Could not initialize messages.</div>';
  }
}

window.directMessagesInit = init;
document.addEventListener('DOMContentLoaded', init);
