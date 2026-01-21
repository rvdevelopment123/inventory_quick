const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const { ItemService, ItemsController } = require('./items');
const CategoryController = require('./categories');
const LocationController = require('./locations');
const ItemTypeController = require('./item_types');
const { Security } = require('../auth/core');

// Inventory service is currently using mock data and needs refactoring to use DB
// const { InventoryController } = require('./inventory'); 

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*', // Allow Vercel frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Localization Middleware (Basic)
app.use((req, res, next) => {
    req.locale = req.headers['accept-language'] || 'en';
    next();
});

// Services & Controllers
const itemService = new ItemService(db);
const itemsController = new ItemsController(itemService);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// Auth Routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username/Email and password are required' });
        }

        const { rows } = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await Security.verifyPassword(password, user.hashed_password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = Security.generateToken(
            { id: user.id, username: user.username, role: user.role }, 
            process.env.JWT_SECRET || 'secret', 
            86400 // 24 hours
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Routes
// Items
app.get('/api/items', (req, res) => itemsController.getAll(req, res));
app.post('/api/items', (req, res) => itemsController.create(req, res));
app.put('/api/items/:id', (req, res) => itemsController.update(req, res));
app.delete('/api/items/:id', (req, res) => itemsController.delete(req, res));

// Categories
app.get('/api/categories', (req, res) => CategoryController.getAll(req, res));
app.post('/api/categories', (req, res) => CategoryController.create(req, res));
app.put('/api/categories/:id', (req, res) => CategoryController.update(req, res));
app.delete('/api/categories/:id', (req, res) => CategoryController.delete(req, res));

// Locations
app.get('/api/locations', (req, res) => LocationController.getAll(req, res));
app.post('/api/locations', (req, res) => LocationController.create(req, res));
app.put('/api/locations/:id', (req, res) => LocationController.update(req, res));
app.delete('/api/locations/:id', (req, res) => LocationController.delete(req, res));

// Item Types
app.get('/api/item-types', (req, res) => ItemTypeController.getAll(req, res));
app.post('/api/item-types', (req, res) => ItemTypeController.create(req, res));
app.put('/api/item-types/:id', (req, res) => ItemTypeController.update(req, res));
app.delete('/api/item-types/:id', (req, res) => ItemTypeController.delete(req, res));

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
