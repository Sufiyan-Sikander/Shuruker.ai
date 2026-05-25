import { useEffect, useMemo, useState } from 'react';

function formatStatus(status) {
  if (!status) return 'Pending';
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function statusClass(status) {
  if (!status) return 'status-pending';
  return `status-${status}`;
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [allFreelancersData, setAllFreelancersData] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, removed: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFreelancer, setCurrentFreelancer] = useState(null);

  const isLoggedIn = Boolean(adminToken);

  const filteredFreelancers = useMemo(() => {
    if (statusFilter === 'all') return allFreelancersData;
    return allFreelancersData.filter((freelancer) => (freelancer.status || 'pending') === statusFilter);
  }, [allFreelancersData, statusFilter]);

  const loadFreelancers = async (token) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/freelancers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setAdminToken('');
          localStorage.removeItem('adminToken');
        }
        return;
      }

      setAllFreelancersData(data.freelancers || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0, removed: 0 });
    } catch (error) {
      console.error('Error loading freelancers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    loadFreelancers(adminToken);
  }, [adminToken]);

  const login = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        setErrorMessage(data.error || 'Invalid credentials');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    setAllFreelancersData([]);
    setStats({ pending: 0, approved: 0, rejected: 0, removed: 0 });
    setModalOpen(false);
    setCurrentFreelancer(null);
  };

  const updateFreelancerStatus = async (freelancerId, isApproved) => {
    if (!adminToken) return;

    try {
      const response = await fetch(`/api/admin/freelancers/${freelancerId}/${isApproved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        setModalOpen(false);
        setCurrentFreelancer(null);
        await loadFreelancers(adminToken);
      }
    } catch (error) {
      console.error('Error updating freelancer:', error);
    }
  };

  const runFreelancerAction = async (freelancerId, actionPath, method) => {
    if (!adminToken) return;

    try {
      const actionSuffix = actionPath ? `/${actionPath}` : '';
      const response = await fetch(`/api/admin/freelancers/${freelancerId}${actionSuffix}`, {
        method,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        setModalOpen(false);
        setCurrentFreelancer(null);
        await loadFreelancers(adminToken);
      }
    } catch (error) {
      console.error('Error running freelancer action:', error);
    }
  };

  const status = currentFreelancer?.status || 'pending';

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-title">
            <h1>⚙️ Admin Dashboard</h1>
            <p>Manage freelancer profiles</p>
          </div>
          {isLoggedIn ? (
            <button className="logout-btn" id="logoutBtn" onClick={logout}>Logout</button>
          ) : null}
        </div>
      </header>

      <div className="admin-content">
        {!isLoggedIn ? (
          <div id="loginSection" className="login-container">
            <div className="login-header">
              <h2>Admin Login</h2>
              <p>Enter your credentials to access the dashboard</p>
            </div>

            <div id="errorMessage" className="error-message" style={{ display: errorMessage ? 'block' : 'none' }}>{errorMessage}</div>

            <form id="loginForm" onSubmit={login}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input type="text" id="username" name="username" required placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <button type="submit" className="login-btn">Login</button>
            </form>
          </div>
        ) : (
          <div id="dashboard" className="dashboard active">
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Pending Applications</div><div className="stat-value" id="pendingCount">{stats.pending || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Approved Freelancers</div><div className="stat-value" id="approvedCount">{stats.approved || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Rejected</div><div className="stat-value" id="rejectedCount">{stats.rejected || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Soft Removed</div><div className="stat-value" id="removedCount">{stats.removed || 0}</div></div>
            </div>

            <div>
              <div className="section-toolbar">
                <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Freelancer Profiles</h2>
                <div className="filter-group">
                  <label htmlFor="statusFilter">Filter:</label>
                  <select id="statusFilter" className="status-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div id="loadingState" className="loading" style={{ display: 'block' }}><div className="spinner"></div></div>
              ) : filteredFreelancers.length === 0 ? (
                <div id="emptyState" className="empty-state" style={{ display: 'block' }}>
                  <div className="empty-state-icon">✓</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>All caught up!</div>
                  <div>No freelancer profiles to review</div>
                </div>
              ) : (
                <div id="freelancersTable" className="freelancers-table active">
                  <div className="table-header">
                    <div>Name & Email</div>
                    <div>Category</div>
                    <div>Bio</div>
                    <div>Status</div>
                    <div>Portfolio</div>
                    <div>Actions</div>
                  </div>
                  <div id="tableContent">
                    {filteredFreelancers.map((freelancer) => (
                      <div className="table-row" key={freelancer.id}>
                        <div>
                          <div className="freelancer-name">{freelancer.fullName || ''}</div>
                          <div className="freelancer-email">{freelancer.email || ''}</div>
                        </div>
                        <div><span className="category-badge">{freelancer.category || 'N/A'}</span></div>
                        <div style={{ fontSize: '13px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(freelancer.bio || '').substring(0, 50)}{(freelancer.bio || '').length > 50 ? '...' : ''}
                        </div>
                        <div><span className={`status-badge ${statusClass(freelancer.status)}`}>{formatStatus(freelancer.status)}</span></div>
                        <div>
                          {freelancer.portfolioPdfUrl ? (
                            <a href={freelancer.portfolioPdfUrl} target="_blank" rel="noreferrer" style={{ color: '#7b61ff', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>📄 PDF</a>
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '13px' }}>N/A</span>
                          )}
                        </div>
                        <div className="action-buttons">
                          <button className="btn-action btn-view" onClick={() => { setCurrentFreelancer(freelancer); setModalOpen(true); }}>View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div id="detailsModal" className={`modal ${modalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">Freelancer Details</div>
          <div className="modal-body">
            <div className="modal-field"><div className="modal-field-label">Full Name</div><div className="modal-field-value" id="modalName">{currentFreelancer?.fullName || ''}</div></div>
            <div className="modal-field"><div className="modal-field-label">Email</div><div className="modal-field-value" id="modalEmail">{currentFreelancer?.email || ''}</div></div>
            <div className="modal-field"><div className="modal-field-label">Category</div><div className="modal-field-value" id="modalCategory">{currentFreelancer?.category || ''}</div></div>
            <div className="modal-field"><div className="modal-field-label">Bio</div><div className="modal-field-value" id="modalBio">{currentFreelancer?.bio || ''}</div></div>
            <div className="modal-field">
              <div className="modal-field-label">Portfolio Link</div>
              <div className="modal-field-value">
                {currentFreelancer?.portfolioLink ? <a id="modalPortfolioLink" href={currentFreelancer.portfolioLink} target="_blank" rel="noreferrer">View External Portfolio</a> : null}
              </div>
            </div>
            <div className="modal-field">
              <div className="modal-field-label">Portfolio PDF</div>
              <div className="modal-field-value">
                {currentFreelancer?.portfolioPdfUrl ? <a id="modalPortfolioPdf" href={currentFreelancer.portfolioPdfUrl} target="_blank" rel="noreferrer">Download PDF</a> : null}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            {(status === 'pending' || status === 'rejected') ? <button className="modal-btn modal-btn-approve" id="modalApproveBtn" onClick={() => updateFreelancerStatus(currentFreelancer.id, true)}>Approve</button> : null}
            {(status === 'pending' || status === 'approved') ? <button className="modal-btn modal-btn-reject" id="modalRejectBtn" onClick={() => updateFreelancerStatus(currentFreelancer.id, false)}>Reject</button> : null}
            {status !== 'removed' ? <button className="modal-btn modal-btn-remove" id="modalSoftRemoveBtn" onClick={() => { if (window.confirm('Soft remove this freelancer profile? You can restore it later.')) runFreelancerAction(currentFreelancer.id, 'soft-remove', 'POST'); }}>Soft Remove</button> : null}
            {status === 'removed' ? <button className="modal-btn modal-btn-restore" id="modalRestoreBtn" onClick={() => runFreelancerAction(currentFreelancer.id, 'restore', 'POST')}>Restore</button> : null}
            <button className="modal-btn modal-btn-delete" id="modalDeleteBtn" onClick={() => { if (window.confirm(`Permanently delete ${currentFreelancer?.fullName || 'this freelancer'}? This cannot be undone.`)) runFreelancerAction(currentFreelancer.id, '', 'DELETE'); }}>Permanent Delete</button>
            <button className="modal-btn modal-btn-close" onClick={() => { setModalOpen(false); setCurrentFreelancer(null); }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
