const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// --- VALIDATION ---
const validateInputs = (name, email, password, address) => {

    if (name.length < 20 || name.length > 60) return "Name must be between 20 and 60 characters.";
    if (address.length > 400) return "Address cannot exceed 400 characters.";
    if (password.length < 8 || password.length > 16) return "Password must be 8-16 characters.";
    if (!/[A-Z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>|]/.test(password)) {
        return "Password must include at least one uppercase letter and one special character.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address format.";
    return null;
};

// --- AUTHENTICATION ROUTES ---

// Normal User 
app.post('/api/signup', async (req, res) => {
    const { name, email, password, address } = req.body;
    const validationError = validateInputs(name, email, password, address);
    if (validationError) return res.status(400).json({ message: validationError });

    try {
        await db.query(
            'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, "User")',
            [name, email, password, address]
        );
        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Email might already exist." });
    }
});

// Single Login  for all roles
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
        if (users.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        // Return user info directly 
        res.json({ id: users[0].id, name: users[0].name, role: users[0].role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Change the Password
app.put('/api/users/password', async (req, res) => {
    const { userId, newPassword } = req.body;
    if (newPassword.length < 8 || newPassword.length > 16) {
        return res.status(400).json({ message: "Password must be 8-16 characters." });
    }
    try {
        await db.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Admin Dashboard Status
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalStores }]] = await db.query('SELECT COUNT(*) as totalStores FROM stores');
        const [[{ totalRatings }]] = await db.query('SELECT COUNT(*) as totalRatings FROM ratings');
        res.json({ totalUsers, totalStores, totalRatings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Add Store, Normal User, or Admin User
app.post('/api/admin/add-user', async (req, res) => {
    const { name, email, password, address, role } = req.body;

    // Reuse the same validation rules
    const validationError = validateInputs(name, email, password, address);
    if (validationError) return res.status(400).json({ message: validationError });

    try {
        await db.query('INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, address, role]);
        res.status(201).json({ message: "User created by Admin" });
    } catch (err) {
        res.status(500).json({ message: "Email might already exist." });
    }
});

// Admin Add Store 
app.post('/api/admin/add-store', async (req, res) => {
    const { name, address, ownerId } = req.body;

    if (!name || !address) {
        return res.status(400).json({ message: "Store name and address are required." });
    }
    if (address.length > 400) {
        return res.status(400).json({ message: "Address cannot exceed 400 characters." });
    }

    try {
        await db.query('INSERT INTO stores (name, address, owner_id) VALUES (?, ?, ?)',
        [name, address, ownerId || null]);
        res.status(201).json({ message: "Store created by Admin" });
    } catch (err) {
        
        res.status(500).json({ message: "That Store Owner is already assigned to a store." });
    }
});

// Admin: list all Store Owners
app.get('/api/admin/store-owners', async (req, res) => {
    try {
        const [owners] = await db.query(
            `SELECT u.id, u.name, u.email
             FROM users u
             LEFT JOIN stores s ON s.owner_id = u.id
             WHERE u.role = 'StoreOwner' AND s.id IS NULL`
        );
        res.json(owners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: list Normal + Admin + StoreOwner users, with filters + sorting
const { name, email, address, role, sortBy, order } = req.query;

    let query = `
        SELECT u.id, u.name, u.email, u.address, u.role,
               (SELECT IFNULL(AVG(r.rating), 0)
                FROM stores s JOIN ratings r ON r.store_id = s.id
                WHERE s.owner_id = u.id) as ownerRating
        FROM users u
    `;

    let conditions = [];
    let params = [];

    if (name) { conditions.push("u.name LIKE ?"); params.push(`%${name}%`); }
    if (email) { conditions.push("u.email LIKE ?"); params.push(`%${email}%`); }
    if (address) { conditions.push("u.address LIKE ?"); params.push(`%${address}%`); }
    if (role) { conditions.push("u.role = ?"); params.push(role); }

    if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");

    const sortableColumns = ['name', 'email', 'address', 'role'];
    const sortColumn = sortableColumns.includes(sortBy) ? sortBy : 'name';
    query += ` ORDER BY u.${sortColumn} ${order === 'desc' ? 'DESC' : 'ASC'}`;

    try {
        const [users] = await db.query(query, params);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }


// Admin: list all stores with Name, Email (owner), Address, Rating + filters/sorting
app.get('/api/admin/stores', async (req, res) => {
    const { name, address, sortBy, order } = req.query;

    let query = `
        SELECT s.id, s.name, s.address, u.email as owner_email,
               IFNULL(AVG(r.rating), 0) as overall_rating
        FROM stores s
        LEFT JOIN users u ON s.owner_id = u.id
        LEFT JOIN ratings r ON s.id = r.store_id
    `;

    let conditions = [];
    let params = [];

    if (name) { conditions.push("s.name LIKE ?"); params.push(`%${name}%`); }
    if (address) { conditions.push("s.address LIKE ?"); params.push(`%${address}%`); }

    if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
    query += " GROUP BY s.id";

    if (sortBy === 'name') query += ` ORDER BY s.name ${order === 'desc' ? 'DESC' : 'ASC'}`;
    else query += ` ORDER BY overall_rating ${order === 'desc' ? 'DESC' : 'ASC'}`;

    try {
        const [stores] = await db.query(query, params);
        res.json(stores);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- NORMAL USER ---

// List Stores with Ratings, filtering and sorting
app.get('/api/stores', async (req, res) => {
    const { search, sortBy, order, userId } = req.query; //ASC or DESC
    let query = `
        SELECT s.*, u.email as owner_email,
               IFNULL(AVG(r.rating), 0) as overall_rating,
               (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = ?) as user_rating
        FROM stores s
        LEFT JOIN users u ON s.owner_id = u.id
        LEFT JOIN ratings r ON s.id = r.store_id
    `;

    let conditions = [];
    let params = [userId || 0];

    if (search) {
        conditions.push("(s.name LIKE ? OR s.address LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
    query += " GROUP BY s.id";

    // Sort
    if (sortBy === 'name') query += ` ORDER BY s.name ${order === 'desc' ? 'DESC' : 'ASC'}`;
    else query += ` ORDER BY overall_rating ${order === 'desc' ? 'DESC' : 'ASC'}`;

    try {
        const [stores] = await db.query(query, params);
        res.json(stores);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Submit or Modify Ratings
app.post('/api/ratings', async (req, res) => {
    const { userId, storeId, rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    try {
        const query = `
            INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating)
        `;
        await db.query(query, [userId, storeId, rating]);
        res.json({ message: "Rating saved!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- STORE OWNER ROUTES ---

app.get('/api/owner/dashboard/:ownerId', async (req, res) => {
    const { ownerId } = req.params;
    try {
        // Get store details
        const [store] = await db.query('SELECT id, name FROM stores WHERE owner_id = ?', [ownerId]);
        if (store.length === 0) return res.status(404).json({ message: "No store assigned to this owner." });

        const storeId = store[0].id;
        // Get rating
        const [[{ avgRating }]] = await db.query('SELECT IFNULL(AVG(rating), 0) as avgRating FROM ratings WHERE store_id = ?', [storeId]);
        // Get users who rated
        const [reviews] = await db.query(`
            SELECT u.name, u.email, r.rating
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            WHERE r.store_id = ?`, [storeId]);

        res.json({ storeName: store[0].name, avgRating, reviews });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));