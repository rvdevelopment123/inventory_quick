const db = require('./db');
const AuditService = require('./audit');

class CategoryService {
    async getAll(filters = {}, pagination = { limit: 20, offset: 0 }) {
        let query = `SELECT * FROM categories WHERE status != 'archived'`;
        const params = [];

        if (filters.name) {
            query += ` AND name LIKE ?`;
            params.push(`%${filters.name}%`);
        }

        query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
        params.push(pagination.limit, pagination.offset);

        const { rows } = await db.query(query, params);
        const { rows: countRows } = await db.query(`SELECT COUNT(*) as total FROM categories WHERE status != 'archived'`);
        
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
        const { rows } = await db.query(`SELECT * FROM categories WHERE id = ?`, [id]);
        if (rows.length === 0) throw new Error('NOT_FOUND');
        return rows[0];
    }

    async create(data, userId) {
        if (!data.name) throw new Error('VALIDATION_ERROR: Name is required');

        const { rows } = await db.query(
            `INSERT INTO categories (name, description, parent_id, status) VALUES (?, ?, ?, ?)`,
            [data.name, data.description || null, data.parent_id || null, 'active']
        );
        
        const newId = rows.insertId;
        await AuditService.log('Category', newId, 'CREATE', data, userId);
        return this.getById(newId);
    }

    async update(id, data, userId) {
        const current = await this.getById(id);
        
        const updates = [];
        const params = [];
        
        if (data.name) { updates.push('name = ?'); params.push(data.name); }
        if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
        
        if (updates.length === 0) return current;

        params.push(id);
        await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);
        
        await AuditService.log('Category', id, 'UPDATE', { from: current, to: data }, userId);
        return this.getById(id);
    }

    async delete(id, userId) {
        await db.query(`UPDATE categories SET status = 'archived' WHERE id = ?`, [id]);
        await AuditService.log('Category', id, 'DELETE', { status: 'archived' }, userId);
        return { id, status: 'archived' };
    }
}

class CategoryController {
    constructor() {
        this.service = new CategoryService();
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
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Category not found' });
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = new CategoryController();
