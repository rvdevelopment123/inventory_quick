const db = require('./db');

class AuditService {
    static async log(entityType, entityId, action, changes, userId) {
        try {
            await db.query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id) VALUES (?, ?, ?, ?, ?)`,
                [entityType, entityId, action, JSON.stringify(changes), userId || null]
            );
        } catch (err) {
            console.error('Audit Log Error:', err);
        }
    }
}

module.exports = AuditService;
