import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // --- AUTHENTICATION & VIEW TOGGLE  ---
  const [user, setUser] = useState(null);
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --- INPUT FORM  ---
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', address: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [newPassword, setNewPassword] = useState('');

  // ---  DATA  OF (Normal User) ---
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // --- ADMIN DATA  ---
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [adminTab, setAdminTab] = useState('dashboard'); // dashboard | users | stores | addUser | addStore
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStores, setAdminStores] = useState([]);
  const [storeOwners, setStoreOwners] = useState([]);
  const [userFilters, setUserFilters] = useState({ name: '', email: '', address: '', role: '' });
  const [storeFilters, setStoreFilters] = useState({ name: '', address: '' });
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '', address: '', role: 'User' });
  const [addStoreForm, setAddStoreForm] = useState({ name: '', address: '', ownerId: '' });

  // --- OWNER DATA  ---
  const [ownerStats, setOwnerStats] = useState(null);

  // --- RE-FETCH DATA  ---
  const loadNormalUserDashboard = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/stores?search=${search}&sortBy=name&order=${sortOrder}&userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStores(data);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error("Error loading stores:", err);
      setStores([]);
    }
  };

  const loadAdminDashboard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/dashboard');
      const data = await res.json();
      setAdminStats(data);
    } catch (err) {
      console.error("Error loading admin stats:", err);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const params = new URLSearchParams(userFilters).toString();
      const res = await fetch(`http://localhost:5000/api/admin/users?${params}`);
      const data = await res.json();
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const loadAdminStores = async () => {
    try {
      const params = new URLSearchParams(storeFilters).toString();
      const res = await fetch(`http://localhost:5000/api/admin/stores?${params}`);
      const data = await res.json();
      setAdminStores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading stores:", err);
    }
  };

  const loadStoreOwners = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/store-owners');
      const data = await res.json();
      setStoreOwners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading store owners:", err);
    }
  };

  const loadOwnerDashboard = async (ownerId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/owner/dashboard/${ownerId}`);
      if (res.ok) {
        const data = await res.json();
        setOwnerStats(data);
      } else {
        setOwnerStats({ storeName: "No Store Assigned", avgRating: 0, reviews: [] });
      }
    } catch (err) {
      console.error("Error loading owner metrics:", err);
    }
  };

  useEffect(() => {
    if (user?.role === 'User') loadNormalUserDashboard(user.id);
    if (user?.role === 'Admin') loadAdminDashboard();
    if (user?.role === 'StoreOwner') loadOwnerDashboard(user.id);
  }, [user, search, sortOrder]);

  // Reload the admin users/stores  
  useEffect(() => {
    if (user?.role !== 'Admin') return;
    if (adminTab === 'users') loadAdminUsers();
    if (adminTab === 'stores') loadAdminStores();
    if (adminTab === 'addStore') loadStoreOwners();
  }, [user, adminTab, userFilters, storeFilters]);

  // --- FORM HANDLING ---
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message);

      alert("Registration successful! Please login.");
      setIsSignup(false);
    } catch (err) {
      setError("Cannot connect to backend server.");
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message);

      setUser(data);
    } catch (err) {
      setError("Cannot connect to backend server.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setError('');
    setMessage('');
    setAdminTab('dashboard');
  };

  const handleRatingSubmit = async (storeId, numericScore) => {
    try {
      await fetch('http://localhost:5000/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, storeId, rating: numericScore })
      });
      loadNormalUserDashboard(user.id);
    } catch (err) {
      alert("Failed to submit rating.");
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword })
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message);

      setMessage("Password updated successfully!");
      setNewPassword('');
    } catch (err) {
      setError("Failed to update password.");
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm)
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message);

      setMessage("User added successfully!");
      setAddUserForm({ name: '', email: '', password: '', address: '', role: 'User' });
      loadAdminDashboard();
    } catch (err) {
      setError("Cannot connect to backend server.");
    }
  };

  const handleAddStoreSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/admin/add-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addStoreForm)
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message);

      setMessage("Store added successfully!");
      setAddStoreForm({ name: '', address: '', ownerId: '' });
      loadAdminDashboard();
      loadStoreOwners();
    } catch (err) {
      setError("Cannot connect to backend server.");
    }
  };

 
  const tabButtonStyle = (tabName) => ({
    padding: '8px 16px',
    marginRight: '10px',
    cursor: 'pointer',
    border: '1px solid #0275d8',
    borderRadius: '4px',
    background: adminTab === tabName ? '#0275d8' : '#fff',
    color: adminTab === tabName ? '#fff' : '#0275d8'
  });

  // --- VIEW SCREEN 1: UNAUTHENTICATED LOGGED OUT ---
  if (!user) {
    return (
      <div style={{ padding: '50px', maxWidth: '450px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff', color: '#333' }}>
        <h2>{isSignup ? "Create Platform Account" : "Login Portal"}</h2>
        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

        {isSignup ? (
          <form onSubmit={handleSignupSubmit}>
            <label>Full Name:</label><br />
            <input type="text" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="Min 20 - Max 60 characters" value={signupData.name} onChange={e => setSignupData({ ...signupData, name: e.target.value })} required /><br /><br />

            <label>Email Address:</label><br />
            <input type="email" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="name@domain.com" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} required /><br /><br />

            <label>Physical Address:</label><br />
            <input type="text" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="Max 400 characters" value={signupData.address} onChange={e => setSignupData({ ...signupData, address: e.target.value })} required /><br /><br />

            <label>Secure Password:</label><br />
            <input type="password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="8-16 chars, 1 Uppercase, 1 Symbol" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} required /><br /><br />

            <button type="submit" style={{ padding: '10px 20px', background: 'green', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Register User Account</button>
            <p onClick={() => { setIsSignup(false); setError(''); }} style={{ color: 'blue', cursor: 'pointer', marginTop: '15px' }}>Existing user? Click here to sign in</p>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <label>Email Address:</label><br />
            <input type="email" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required /><br /><br />

            <label>Account Password:</label><br />
            <input type="password" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required /><br /><br />

            <button type="submit" style={{ padding: '10px 20px', background: 'blue', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Sign In</button>
            <p onClick={() => { setIsSignup(true); setError(''); }} style={{ color: 'blue', cursor: 'pointer', marginTop: '15px' }}>New to the platform? Click here to register</p>
          </form>
        )}
      </div>
    );
  }

  // --- VIEW SCREEN 2: MAIN DASHBOARD HOMEPAGE ---
  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#fff', color: '#333', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h2>Store Rating Hub — Welcome, {user.name}!</h2>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#d9534f', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Log Out</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div style={{ margin: '20px 0', padding: '15px', background: '#f5f5f5', borderRadius: '5px', border: '1px solid #ddd' }}>
        <h4>Modify Account Credentials</h4>
        <form onSubmit={handlePasswordChangeSubmit}>
          <input type="password" placeholder="Type new secure password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ padding: '6px', width: '250px', marginRight: '10px' }} />
          <button type="submit" style={{ padding: '6px 12px', cursor: 'pointer' }}>Update Password</button>
        </form>
      </div>

      {/* --- DASHBOARD SECTION A: SYSTEM ADMINISTRATOR --- */}
      {user.role === 'Admin' && (
        <div style={{ border: '1px solid #0275d8', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
          <h3 style={{ color: '#0275d8' }}>Administrator Operational Metrics</h3>
          <div style={{ display: 'flex', gap: '30px', margin: '20px 0' }}>
            <div style={{ padding: '20px', background: '#e6f2ff', borderRadius: '5px', textAlign: 'center', minWidth: '120px' }}>
              <h2>{adminStats.totalUsers}</h2>
              <p>Registered Users</p>
            </div>
            <div style={{ padding: '20px', background: '#e6f2ff', borderRadius: '5px', textAlign: 'center', minWidth: '120px' }}>
              <h2>{adminStats.totalStores}</h2>
              <p>Managed Stores</p>
            </div>
            <div style={{ padding: '20px', background: '#e6f2ff', borderRadius: '5px', textAlign: 'center', minWidth: '120px' }}>
              <h2>{adminStats.totalRatings}</h2>
              <p>Submitted Scores</p>
            </div>
          </div>

          {/* Tabs to switch between different admin screens */}
          <div style={{ margin: '20px 0' }}>
            <button style={tabButtonStyle('dashboard')} onClick={() => setAdminTab('dashboard')}>Dashboard</button>
            <button style={tabButtonStyle('users')} onClick={() => setAdminTab('users')}>View Users</button>
            <button style={tabButtonStyle('stores')} onClick={() => setAdminTab('stores')}>View Stores</button>
            <button style={tabButtonStyle('addUser')} onClick={() => setAdminTab('addUser')}>Add User</button>
            <button style={tabButtonStyle('addStore')} onClick={() => setAdminTab('addStore')}>Add Store</button>
          </div>

          {/* --- VIEW USERS --- */}
          {adminTab === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input placeholder="Filter by Name" value={userFilters.name} onChange={e => setUserFilters({ ...userFilters, name: e.target.value })} style={{ padding: '6px' }} />
                <input placeholder="Filter by Email" value={userFilters.email} onChange={e => setUserFilters({ ...userFilters, email: e.target.value })} style={{ padding: '6px' }} />
                <input placeholder="Filter by Address" value={userFilters.address} onChange={e => setUserFilters({ ...userFilters, address: e.target.value })} style={{ padding: '6px' }} />
                <select value={userFilters.role} onChange={e => setUserFilters({ ...userFilters, role: e.target.value })} style={{ padding: '6px' }}>
                  <option value="">All Roles</option>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="StoreOwner">StoreOwner</option>
                </select>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Email</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Address</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Role</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Rating (if Store Owner)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.email}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.address}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{u.role}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {u.role === 'StoreOwner' ? Number(u.ownerRating).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- VIEW STORES --- */}
          {adminTab === 'stores' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input placeholder="Filter by Name" value={storeFilters.name} onChange={e => setStoreFilters({ ...storeFilters, name: e.target.value })} style={{ padding: '6px' }} />
                <input placeholder="Filter by Address" value={storeFilters.address} onChange={e => setStoreFilters({ ...storeFilters, address: e.target.value })} style={{ padding: '6px' }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Owner Email</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Address</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Overall Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStores.map(s => (
                    <tr key={s.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{s.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{s.owner_email || '—'}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{s.address}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{Number(s.overall_rating).toFixed(1)}</td>
                    </tr>
                  ))}
                  {adminStores.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '12px', textAlign: 'center' }}>No stores found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* --- ADD USER --- */}
          {adminTab === 'addUser' && (
            <form onSubmit={handleAddUserSubmit} style={{ maxWidth: '400px' }}>
              <label>Full Name:</label><br />
              <input type="text" placeholder="Min 20 - Max 60 characters" value={addUserForm.name} onChange={e => setAddUserForm({ ...addUserForm, name: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Email Address:</label><br />
              <input type="email" value={addUserForm.email} onChange={e => setAddUserForm({ ...addUserForm, email: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Address:</label><br />
              <input type="text" placeholder="Max 400 characters" value={addUserForm.address} onChange={e => setAddUserForm({ ...addUserForm, address: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Password:</label><br />
              <input type="password" placeholder="8-16 chars, 1 Uppercase, 1 Symbol" value={addUserForm.password} onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Role:</label><br />
              <select value={addUserForm.role} onChange={e => setAddUserForm({ ...addUserForm, role: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="StoreOwner">StoreOwner</option>
              </select><br /><br />

              <button type="submit" style={{ padding: '10px 20px', background: 'green', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Create User</button>
            </form>
          )}

          {/* --- ADD STORE --- */}
          {adminTab === 'addStore' && (
            <form onSubmit={handleAddStoreSubmit} style={{ maxWidth: '400px' }}>
              <label>Store Name:</label><br />
              <input type="text" value={addStoreForm.name} onChange={e => setAddStoreForm({ ...addStoreForm, name: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Address:</label><br />
              <input type="text" placeholder="Max 400 characters" value={addStoreForm.address} onChange={e => setAddStoreForm({ ...addStoreForm, address: e.target.value })} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} /><br /><br />

              <label>Assign Store Owner:</label><br />
              <select value={addStoreForm.ownerId} onChange={e => setAddStoreForm({ ...addStoreForm, ownerId: e.target.value })} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
                <option value="">-- No Owner --</option>
                {storeOwners.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
              <p style={{ fontSize: '13px', color: '#777' }}>Only Store Owners not yet attached to a store are listed here. Create a StoreOwner user first if the list is empty.</p>
              <br />

              <button type="submit" style={{ padding: '10px 20px', background: 'green', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Create Store</button>
            </form>
          )}
        </div>
      )}

      {/* --- DASHBOARD SECTION B: NORMAL USER --- */}
      {user.role === 'User' && (
        <div style={{ border: '1px solid #5cb85c', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
          <h3 style={{ color: '#5cb85c' }}>Browse & Rate Stores</h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              placeholder="Search by store name or address"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px', flexGrow: 1 }}
            />
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: '8px' }}>
              <option value="asc">Name: A to Z</option>
              <option value="desc">Name: Z to A</option>
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Store Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Address</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Overall Rating</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Your Rating</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Submit / Modify Rating</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(store => (
                <tr key={store.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{store.name}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{store.address}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{Number(store.overall_rating).toFixed(1)}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{store.user_rating || 'Not rated yet'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => handleRatingSubmit(store.id, score)}
                        style={{
                          padding: '4px 8px',
                          marginRight: '4px',
                          cursor: 'pointer',
                          background: store.user_rating === score ? '#5cb85c' : '#eee',
                          color: store.user_rating === score ? '#fff' : '#333',
                          border: '1px solid #ccc',
                          borderRadius: '3px'
                        }}
                      >
                        {score}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center' }}>No stores found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- DASHBOARD SECTION C: STORE OWNER --- */}
      {user.role === 'StoreOwner' && ownerStats && (
        <div style={{ border: '1px solid #f0ad4e', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
          <h3 style={{ color: '#f0ad4e' }}>Your Store: {ownerStats.storeName}</h3>
          <div style={{ padding: '20px', background: '#fff8ec', borderRadius: '5px', textAlign: 'center', maxWidth: '200px', margin: '15px 0' }}>
            <h2>{Number(ownerStats.avgRating).toFixed(1)}</h2>
            <p>Average Rating</p>
          </div>

          <h4>Customers Who Rated Your Store</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {ownerStats.reviews.map((rev, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rev.name}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rev.email}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rev.rating}</td>
                </tr>
              ))}
              {ownerStats.reviews.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>No ratings submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;