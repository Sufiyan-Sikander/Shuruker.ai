import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { loadScript } from '../loadScript';
import { flaskBaseUrl } from '../authConfig';

export default function ChatPage() {
  useEffect(() => {
    document.body.classList.add('chat-page');
    window.firebaseAuth = auth;
    window.onAuthStateChanged = onAuthStateChanged;

    let cancelled = false;

    const boot = async () => {
      await loadScript('/static/js/chat.js');
      if (!cancelled && typeof window.chatInit === 'function') {
        window.chatInit();
      }
    };

    boot().catch((error) => console.error(error));

    return () => {
      cancelled = true;
      document.body.classList.remove('chat-page');
    };
  }, []);

  return (
    <>
      <div className="chat-bg-decor">
        <div className="decor-blob blob-1"></div>
        <div className="decor-blob blob-2"></div>
        <div className="decor-blob blob-3"></div>
      </div>

      <header className="nav chat-nav">
        <div className="container nav-inner">
          <a className="brand" href="/" aria-label="ShurukerAi home">
            <div className="logo"><img src="/static/images/logo2.png" alt="ShurukerAi logo" /></div>
            <div className="brand-text">
              <span className="brand-name">ShurukerAi</span>
              <small className="brand-slogan">Pakistan's Smart Business Launch Partner</small>
            </div>
          </a>
          <nav className="nav-links">
            <div className="nav-dropdown">
              <a href="/freelancers" className="dropdown-toggle">Services</a>
              <div className="dropdown-menu">
                <a href="/register-freelancer">Register as Freelancer</a>
                <a href="/freelancer-login">Login as Freelancer</a>
                <a href="/freelancers">Find Freelancer</a>
              </div>
            </div>
            <a id="messagesLink" href="/client-messages">Inbox</a>
            <a className="signup" href={`${flaskBaseUrl}/logout`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px' }}>
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Logout
            </a>
          </nav>
        </div>
      </header>

      <main className="chat-container">
        <aside className="conversation-sidebar" id="conversationSidebar">
          <div className="sidebar-header">
            <h3>Chat History</h3>
            <button className="new-chat-btn" id="newChatBtn" title="Start New Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="conversations-list" id="conversationsList">
            <div className="loading-conversations">Loading conversations...</div>
          </div>
        </aside>

        <div className="chat-wrapper">
          <div className="chat-header">
            <div className="chat-header-left">
              <button className="sidebar-toggle" id="sidebarToggle" title="Toggle Sidebar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <div className="chat-avatar-large">
                <div className="avatar-gradient">S</div>
                <div className="status-indicator"></div>
              </div>
              <div className="chat-header-info">
                <h2>ShurukerAi Assistant</h2>
                <p className="chat-status">
                  <span className="status-dot"></span>
                  Online - Ready to help
                </p>
              </div>
            </div>
            <div className="chat-header-stats">
              <div className="stat-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor" />
                </svg>
                <span>AI Powered</span>
              </div>
              <div className="stat-badge context-badge" id="contextBadge" style={{ display: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-8V7h-2v5l4 2 1-1.5-3-1.5z" fill="currentColor" />
                </svg>
                <span id="contextCount">0 msgs</span>
              </div>
            </div>
          </div>

          <div className="chat-messages" id="chatMessages">
            <div className="message bot-message welcome-message">
              <div className="message-avatar">
                <div className="avatar">S</div>
              </div>
              <div className="message-content">
                <div className="message-bubble">
                  <div className="welcome-header">
                    <h3>👋 Welcome to ShurukerAi!</h3>
                  </div>
                  <p>I'm your AI-powered business assistant, specialized in helping Pakistani entrepreneurs launch and grow their businesses.</p>

                  <div className="capabilities-grid">
                    <div className="capability-item"><span className="capability-icon">💡</span><span>Idea Validation</span></div>
                    <div className="capability-item"><span className="capability-icon">📊</span><span>Market Research</span></div>
                    <div className="capability-item"><span className="capability-icon">🗺️</span><span>Launch Roadmap</span></div>
                    <div className="capability-item"><span className="capability-icon">💰</span><span>Budget Planning</span></div>
                    <div className="capability-item"><span className="capability-icon">📈</span><span>Growth Strategy</span></div>
                    <div className="capability-item"><span className="capability-icon">🎯</span><span>Marketing Insights</span></div>
                  </div>

                  <div className="quick-questions">
                    <p className="quick-questions-label">Try asking:</p>
                    <button className="quick-question-btn" onClick={() => window.askQuestion?.('How do I start a clothing store in Lahore?')}>
                      "How do I start a clothing store in Lahore?"
                    </button>
                    <button className="quick-question-btn" onClick={() => window.askQuestion?.('What is the startup budget for a cafe?')}>
                      "What is the startup budget for a cafe?"
                    </button>
                    <button className="quick-question-btn" onClick={() => window.askQuestion?.('Help me validate my business idea')}>
                      "Help me validate my business idea"
                    </button>
                  </div>
                </div>
                <div className="message-time">Just now</div>
              </div>
            </div>
          </div>

          <div className="chat-input-area">
            <div className="typing-indicator" id="typingIndicator" style={{ display: 'none' }}>
              <div className="typing-avatar"><div className="avatar-mini">S</div></div>
              <div className="typing-dots"><span></span><span></span><span></span></div>
              <span className="typing-text">ShurukerAi is thinking...</span>
            </div>

            <form id="chatForm" className="chat-form">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="userInput"
                  placeholder="Ask anything about your business idea..."
                  autoComplete="off"
                  aria-label="Type your message"
                />
                <button type="submit" className="btn-send" aria-label="Send message">
                  <span className="btn-text">Send</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.6563168,11.6889879 L4.13399899,2.89214702 C3.34915502,2.5952849 2.40734225,2.70604706 1.77946707,3.13399899 C0.994623095,3.72451077 0.837654326,4.81394249 1.15159189,5.52938778 L3.03521743,12.0703808 C3.03521743,12.2274782 3.19218622,12.3845756 3.50612381,12.3845756 L16.6915026,13.1700625 C16.6915026,13.1700625 17.1624089,13.1700625 17.1624089,12.8232004 L17.1624089,12.4744748 C17.1624089,12.1276127 16.6915026,12.4744748 16.6915026,12.4744748 Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <p className="input-hint">Press Enter to send • Pakistan-focused AI business guidance</p>
            </form>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">© 2025 ShurukerAi — Built for Pakistani entrepreneurs.</div>
      </footer>
    </>
  );
}
