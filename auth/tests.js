
const assert = require('assert');
const { AuthService, AuthMiddleware } = require('./middleware');
const { LoginHandler } = require('./login');
const { AuthCore } = require('./core');

// Mock Database and Request/Response
class MockDB {
    constructor() {
        this.users = [
            { 
                id: 1, 
                username: 'admin', 
                email: 'admin@test.com', 
                hashed_password: '$2b$10$hashedpassword', // Mock hash 
                role: 'admin' 
            },
            { 
                id: 2, 
                username: 'user', 
                email: 'user@test.com', 
                hashed_password: '$2b$10$hashedpassword', 
                role: 'user' 
            }
        ];
        this.refreshTokens = [];
    }

    async findUserByEmail(email) {
        return this.users.find(u => u.email === email);
    }

    async saveRefreshToken(userId, tokenHash, expiresAt) {
        this.refreshTokens.push({ userId, tokenHash, expiresAt });
    }
}

class MockReq {
    constructor(headers = {}, body = {}) {
        this.headers = headers;
        this.body = body;
        this.user = null;
    }
    
    get(header) {
        return this.headers[header.toLowerCase()];
    }
}

class MockRes {
    constructor() {
        this.statusCode = 200;
        this.jsonData = null;
        this.headers = {};
    }

    status(code) {
        this.statusCode = code;
        return this;
    }

    json(data) {
        this.jsonData = data;
        return this;
    }
    
    setHeader(key, value) {
        this.headers[key] = value;
    }
}

// Test Suite
async function runTests() {
    console.log('Starting Auth System Tests...\n');
    
    const db = new MockDB();
    const authService = new AuthService('secret-key');
    
    // Mock bcrypt compare to always true for "password123" if hash matches
    // In real unit tests we'd stub AuthCore methods, but here we'll patch it
    AuthCore.comparePassword = async (plain, hashed) => plain === 'Password123!'; 

    const loginHandler = new LoginHandler(authService, db);
    const middleware = new AuthMiddleware(authService);

    // Test 1: Successful Admin Login
    console.log('Test 1: Admin Login (Success)');
    const req1 = new MockReq({}, { email: 'admin@test.com', password: 'Password123!' });
    const res1 = new MockRes();
    await loginHandler.handle(req1, res1);
    
    assert.strictEqual(res1.statusCode, 200);
    assert.ok(res1.jsonData.accessToken);
    assert.ok(res1.jsonData.refreshToken);
    const adminToken = res1.jsonData.accessToken;
    console.log('✅ Passed\n');

    // Test 2: Invalid Password
    console.log('Test 2: Invalid Password');
    const req2 = new MockReq({}, { email: 'admin@test.com', password: 'wrong' });
    const res2 = new MockRes();
    AuthCore.comparePassword = async () => false; // Mock failure
    await loginHandler.handle(req2, res2);
    
    assert.strictEqual(res2.statusCode, 401);
    console.log('✅ Passed\n');

    // Test 3: Middleware - Valid Token (Admin)
    console.log('Test 3: Middleware Authorization (Admin)');
    const req3 = new MockReq({ 'authorization': `Bearer ${adminToken}` });
    const res3 = new MockRes();
    const next3 = () => { req3.nextCalled = true; };
    
    await middleware.authenticate(req3, res3, next3);
    assert.ok(req3.user);
    assert.strictEqual(req3.user.role, 'admin');
    
    // Check Role Access
    const adminOnly = middleware.requireRole('admin');
    let adminAccess = false;
    adminOnly(req3, res3, () => { adminAccess = true; });
    assert.ok(adminAccess);
    console.log('✅ Passed\n');

    // Test 4: Middleware - Missing Token
    console.log('Test 4: Middleware Missing Token');
    const req4 = new MockReq({});
    const res4 = new MockRes();
    await middleware.authenticate(req4, res4, () => {});
    
    assert.strictEqual(res4.statusCode, 401);
    console.log('✅ Passed\n');

    console.log('All Tests Completed Successfully.');
}

runTests().catch(console.error);
