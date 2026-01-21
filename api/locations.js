const db = require('./db');
const AuditService = require('./audit');

class LocationService {
    async getAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        let query = `SELECT * FROM locations WHERE status != 'inactive'`;
        const params = [];

        if (filters.name) {
            query += ` AND name LIKE ?`;
            params.push(`%${filters.name}%`);
        }

        query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
        params.push(pagination.limit, pagination.offset);

        const { rows } = await db.query(query, params);
        const { rows: countRows } = await db.query(`SELECT COUNT(*) as total FROM locations WHERE status != 'inactive'`);

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
        const { rows } = await db.query(`SELECT * FROM locations WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND');
        return rows[0];
    }

    async create(data, userId) {
        if (!data.name) throw new Error('VALIDATION_ERROR: Name is required');

        const { rows } = await db.query(
            `INSERT INTO locations (name, description, address, latitude, longitude, status, version) VALUES (?, ?, ?, ?, ?, 'active', 1)`,
            [data.name, data.description || null, data.address || null, data.latitude || null, data.longitude || null]
        );
        
        const newId = rows.insertId;
        await AuditService.log('Location', newId, 'CREATE', data, userId);
        return this.getById(newId);
    }

    async update(id, data, userId) {
        const current = await this.getById(id);
        
        const updates = [];
        const params = [];
        
        if (data.version && data.version !== current.version) {
            throw new Error('CONFLICT: Version mismatch');
        }

        if (data.name) { updates.push('name = ?'); params.push(data.name); }
        if (data.address !== undefined) { updates.push('address = ?'); params.push(data.address); }
        
        if (updates.length === 0) return current;

        updates.push('version = version + 1');
        params.push(id);
        
        await db.query(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`, params);
        await AuditService.log('Location', id, 'UPDATE', { from: current, to: data }, userId);
        return this.getById(id);
    }

    async delete(id, userId) {
        await db.query(`UPDATE locations SET status = 'inactive' WHERE id = ?`, [id]);
        await AuditService.log('Location', id, 'DELETE', { status: 'inactive' }, userId);
        return { id, status: 'inactive' };
    }
}

class LocationController {
    constructor() {
        this.service = new LocationService();
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
        if (err.message.startsWith('CONFLICT')) return res.status(409).json({ error: err.message });
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Location not found' });
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = new LocationController();
