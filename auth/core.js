const crypto = require('crypto');

// Configuration
const AUTH_CONFIG = {
    SALT_ROUNDS: 12,
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    JWT_SECRET: process.env.JWT_SECRET || 'secure-secret-key-change-in-production',
    REFRESH_SECRET: process.env.REFRESH_SECRET || 'refresh-secret-key-change-in-production'
};

/**
 * Security Utilities
 */
const Security = {
    /**
     * Hash a password using PBKDF2 (simulating bcrypt for dependency-free implementation)
     * In production, use 'bcrypt' library: await bcrypt.hash(password, 12)
     */
    hashPassword: async (password) => {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(16).toString('hex');
            crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
                if (err) reject(err);
                resolve(`${salt}:${derivedKey.toString('hex')}`);
            });
        });
    },

    /**
     * Verify a password
     */
    verifyPassword: async (password, hash) => {
        return new Promise((resolve, reject) => {
            const [salt, key] = hash.split(':');
            crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
                if (err) reject(err);
                resolve(key === derivedKey.toString('hex'));
            });
        });
    },

    /**
     * Generate a JWT-like token (HMAC-SHA256)
     * In production, use 'jsonwebtoken' library
     */
    generateToken: (payload, secret, expirySeconds) => {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        const body = Buffer.from(JSON.stringify({ 
            ...payload, 
            iat: now, 
            exp: now + expirySeconds 
        })).toString('base64url');
        
        const signature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

        return `${header}.${body}.${signature}`;
    },

    /**
     * Verify and decode a token
     */
    verifyToken: (token, secret) => {
        const [header, body, signature] = token.split('.');
        if (!header || !body || !signature) throw new Error('Invalid token format');

        const validSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== validSignature) throw new Error('Invalid signature');

        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (Date.now() / 1000 > payload.exp) throw new Error('Token expired');

        return payload;
    }
};

/**
 * Rate Limiter (Memory Store)
 * In production, use Redis
 */
class RateLimiter {
    constructor(limit, windowSeconds) {
        this.limit = limit;
        this.window = windowSeconds * 1000;
        this.hits = new Map();
    }

    check(ip) {
        const now = Date.now();
        const record = this.hits.get(ip);

        if (!record) {
            this.hits.set(ip, { count: 1, reset: now + this.window });
            return true;
        }

        if (now > record.reset) {
            record.count = 1;
            record.reset = now + this.window;
            return true;
        }

        if (record.count >= this.limit) return false;

        record.count++;
        return true;
    }
}

module.exports = { AUTH_CONFIG, Security, RateLimiter };
