
// api/items.js
// Framework-agnostic Item Management API Implementation

const validCategories = new Set(['Baking', 'Produce', 'Meat', 'Dairy', 'Packaging', 'Beverage']);
const validUnits = new Set(['kg', 'g', 'l', 'ml', 'pcs', 'bag', 'case', 'box', 'lb', 'oz']);
const validTypes = new Set(['ingredient', 'finished_good']);
const validStatuses = new Set(['active', 'inactive']);

class ItemService {
    constructor(db) {
        this.db = db; // Assume generic DB adapter interface
    }

    async getItems(filters = {}, pagination = { limit: 20, offset: 0 }, sort = { field: 'name', order: 'asc' }) {
        let query = `
            SELECT id, sku, name, category, unit_of_measure, type, status, created_at, updated_at
            FROM items
            WHERE 1=1
        `;
        const params = [];
        let paramIdx = 1;

        // Filtering
        if (filters.name) {
            query += ` AND name ILIKE $${paramIdx++}`;
            params.push(`%${filters.name}%`);
        }
        if (filters.category) {
            query += ` AND category = $${paramIdx++}`;
            params.push(filters.category);
        }
        if (filters.type) {
            query += ` AND type = $${paramIdx++}`;
            params.push(filters.type);
        }
        if (filters.status) {
            query += ` AND status = $${paramIdx++}`;
            params.push(filters.status);
        }

        // Count Total (simplified for demo, usually separate query)
        const totalQuery = `SELECT COUNT(*) as total FROM items WHERE 1=1 ` + query.split('WHERE 1=1')[1];
        
        // Sorting
        const allowedSortFields = ['name', 'created_at'];
        const sortField = allowedSortFields.includes(sort.field) ? sort.field : 'name';
        const sortOrder = sort.order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Pagination
        query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(pagination.limit, pagination.offset);

        // Execute (simulated)
        // const items = await this.db.query(query, params);
        // const total = await this.db.query(totalQuery, params.slice(0, -2));
        
        // Mock Response for Demonstration
        return {
            data: [], // populated by DB
            pagination: {
                total: 0,
                limit: pagination.limit,
                offset: pagination.offset
            }
        };
    }

    async createItem(data) {
        this.validateItemData(data);
        
        // Business Rule: Unique name+category
        // const { rows } = await this.db.query('SELECT 1 FROM items WHERE name = ? AND category = ?', [data.name, data.category]);
        // if (rows.length > 0) throw new Error('DUPLICATE_ITEM');

        const query = `
            INSERT INTO items (sku, name, category, unit_of_measure, type, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `;
        // const { rows } = await this.db.query(query, [generateSku(), data.name, data.category, data.unit_of_measure, data.type]);
        // MySQL doesn't support RETURNING, so we'd typically use LAST_INSERT_ID() or just return the data we have.
        // For this mock implementation, we'll return the mock data.
        return { ...data, id: 999, status: 'active', created_at: new Date() };
    }

    async updateItem(id, data) {
        // Business Rule: Cannot modify status via PUT
        if (data.status) {
            throw new Error('STATUS_UPDATE_FORBIDDEN: Use DELETE endpoint to archive items');
        }

        // Business Rule: Check if archived
        // const { rows: current } = await this.db.query('SELECT status FROM items WHERE id = ?', [id]);
        // if (current[0].status === 'inactive') throw new Error('ITEM_ARCHIVED');

        if (data.name || data.category || data.unit_of_measure || data.type) {
            this.validateItemData(data, true);
        }

        // Perform Update
        // ...
        return { id, ...data, updated_at: new Date() };
    }

    async deleteItem(id) {
        // Soft Delete
        const query = `UPDATE items SET status = 'inactive', updated_at = NOW() WHERE id = ?`;
        // await this.db.query(query, [id]);
        return { id, status: 'inactive' };
    }

    validateItemData(data, isPartial = false) {
        const errors = {};

        if (!isPartial && !data.name) errors.name = 'Name is required';
        if (data.name && (data.name.length < 2 || data.name.length > 100)) errors.name = 'Name must be between 2 and 100 chars';

        if (!isPartial && !data.category) errors.category = 'Category is required';
        if (data.category && !validCategories.has(data.category)) errors.category = `Invalid category. Allowed: ${Array.from(validCategories).join(', ')}`;

        if (!isPartial && !data.unit_of_measure) errors.unit_of_measure = 'UOM is required';
        if (data.unit_of_measure && !validUnits.has(data.unit_of_measure)) errors.unit_of_measure = `Invalid UOM. Allowed: ${Array.from(validUnits).join(', ')}`;

        if (!isPartial && !data.type) errors.type = 'Type is required';
        if (data.type && !validTypes.has(data.type)) errors.type = `Invalid type. Allowed: ${Array.from(validTypes).join(', ')}`;

        if (Object.keys(errors).length > 0) {
            const error = new Error('Validation Failed');
            error.code = 'VALIDATION_ERROR';
            error.details = errors;
            throw error;
        }
    }
}

class ItemsController {
    constructor(service) {
        this.service = service;
    }

    async getAll(req, res) {
        try {
            const filters = {
                name: req.query.name,
                category: req.query.category,
                type: req.query.type,
                status: req.query.status
            };
            const pagination = {
                limit: parseInt(req.query.limit) || 20,
                offset: parseInt(req.query.offset) || 0
            };
            const sort = {
                field: req.query.sort_by || 'name',
                order: req.query.sort_order || 'asc'
            };

            const result = await this.service.getItems(filters, pagination, sort);
            res.status(200).json(result);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async create(req, res) {
        try {
            const result = await this.service.createItem(req.body);
            res.status(201).json(result);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async update(req, res) {
        try {
            const result = await this.service.updateItem(req.params.id, req.body);
            res.status(200).json(result);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async delete(req, res) {
        try {
            await this.service.deleteItem(req.params.id);
            res.status(204).send();
        } catch (err) {
            this.handleError(res, err);
        }
    }

    handleError(res, err) {
        if (err.code === 'VALIDATION_ERROR') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: err.details
                }
            });
        }
        if (err.message.includes('STATUS_UPDATE_FORBIDDEN')) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
        }
        if (err.message.includes('DUPLICATE_ITEM')) {
            return res.status(409).json({ error: { code: 'CONFLICT', message: 'Item with this name and category already exists' } });
        }
        console.error(err);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
    }
}

module.exports = { ItemService, ItemsController };
