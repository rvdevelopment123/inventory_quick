const db = require('./db');
const AuditService = require('./audit');

// Simple in-memory cache for Item Types
const typeCache = new Map();

class ItemTypeService {
    async getAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        let query = `SELECT * FROM item_types WHERE status = 'active'`;
        const params = [];

        query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
        params.push(pagination.limit, pagination.offset);

        const { rows } = await db.query(query, params);
        const { rows: countRows } = await db.query(`SELECT COUNT(*) as total FROM item_types WHERE status = 'active'`);

        return {
            data: rows,
            pagination: {
                total: countRows[0].total,
                limit: pagination.limit,
                offset: pagination.offset
            }
        };
    }

    async getById(id) {
        if (typeCache.has(id)) return typeCache.get(id);

        const { rows } = await db.query(`SELECT * FROM item_types WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND');
        
        typeCache.set(id, rows[0]);
        return rows[0];
    }

    async create(data, userId) {
        if (!data.name) throw new Error('VALIDATION_ERROR: Name is required');

        const { rows } = await db.query(
            `INSERT INTO item_types (name, description, schema_definition, parent_id, status, version) VALUES (?, ?, ?, ?, 'active', 1)`,
            [data.name, data.description || null, JSON.stringify(data.schema_definition || {}), data.parent_id || null]
        );
        
        const newId = rows.insertId;
        await AuditService.log('ItemType', newId, 'CREATE', data, userId);
        return this.getById(newId);
    }

    async update(id, data, userId) {
        const current = await this.getById(id);
        
        const updates = [];
        const params = [];
        
        if (data.name) { updates.push('name = ?'); params.push(data.name); }
        if (data.schema_definition) { updates.push('schema_definition = ?'); params.push(JSON.stringify(data.schema_definition)); }
        
        if (updates.length === 0) return current;

        updates.push('version = version + 1');
        params.push(id);
        
        await db.query(`UPDATE item_types SET ${updates.join(', ')} WHERE id = ?`, params);
        typeCache.delete(parseInt(id)); // Invalidate cache
        
        await AuditService.log('ItemType', id, 'UPDATE', { from: current, to: data }, userId);
        return this.getById(id);
    }

    async delete(id, userId) {
        await db.query(`UPDATE item_types SET status = 'inactive' WHERE id = ?`, [id]);
        typeCache.delete(parseInt(id)); // Invalidate cache
        await AuditService.log('ItemType', id, 'DELETE', { status: 'inactive' }, userId);
        return { id, status: 'inactive' };
    }
}

class ItemTypeController {
    constructor() {
        this.service = new ItemTypeService();
    }

    async getAll(req, res) {
        try {
            const result = await this.service.getAll(req.query, {
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
            });
            res.json(result);
        } catch (err) { this.handleError(res, err); }
    }

    async create(req, res) {
        try {
            const result = await this.service.create(req.body, req.user?.id || 1);
            res.status(201).json(result);
        } catch (err) { this.handleError(res, err); }
    }

    async update(req, res) {
        try {
            const result = await this.service.update(req.params.id, req.body, req.user?.id || 1);
            res.json(result);
        } catch (err) { this.handleError(res, err); }
    }

    async delete(req, res) {
        try {
            await this.service.delete(req.params.id, req.user?.id || 1);
            res.status(204).send();
        } catch (err) { this.handleError(res, err); }
    }

    handleError(res, err) {
        if (err.message.startsWith('VALIDATION_ERROR')) return res.status(400).json({ error: err.message });
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Item Type not found' });
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = new ItemTypeController();
