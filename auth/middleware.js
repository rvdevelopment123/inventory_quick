/**
 * Auth Middleware Logic
 * Implements token verification, role validation, and request authorization.
 * 
 * Dependencies:
 * - auth/core.js
 */

const { verifyAccessToken } = require('./core');

/**
 * Error Types
 */
class AuthError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}

/**
 * Middleware Factory
 * Returns a framework-agnostic middleware function.
 * 
 * @param {Object} context - Database connection or context
 * @returns {Function} Middleware handler
 */
function createAuthMiddleware(context) {
    return async (req) => {
        // 1. Extract Token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthError('Missing or invalid authorization header', 401);
        }

        const token = authHeader.split(' ')[1];

        try {
            // 2. Verify Token
            const decoded = verifyAccessToken(token);

            // 3. Attach User to Request
            // In a real app, you might fetch full user details from DB here
            // using context.db.users.find(decoded.userId)
            // For now, we trust the token claims for statelessness (except revocation checks)
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role
            };

            return true; // Success
        } catch (err) {
            throw new AuthError('Invalid or expired token', 401);
        }
    };
}

/**
 * Role Guard Factory
 * Enforces RBAC.
 * 
 * @param {Array<string>} allowedRoles 
 * @returns {Function} Guard handler
 */
function requireRole(allowedRoles) {
    return (req) => {
        if (!req.user) {
            throw new AuthError('User not authenticated', 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            // Log security event
            console.warn(`[SECURITY] Unauthorized access attempt by user ${req.user.id} (${req.user.role}) to restricted resource.`);
            throw new AuthError('Insufficient permissions', 403);
        }

        return true;
    };
}

/**
 * Example Framework Adapter (Express-style)
 */
const expressAdapter = (middlewareFn) => {
    return async (req, res, next) => {
        try {
            await middlewareFn(req);
            next();
        } catch (err) {
            if (err instanceof AuthError) {
                res.status(err.code).json({ error: err.message });
            } else {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    };
};

module.exports = {
    AuthError,
    createAuthMiddleware,
    requireRole,
    expressAdapter
};
