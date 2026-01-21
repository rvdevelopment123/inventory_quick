
const { items, locations, inventory_movements, db } = require('./items'); // Reusing mock DB from items.js

// --- Service Layer ---

class InventoryService {
    // 1. Stock In
    static async receiveStock({ item_id, quantity, location_id, reference_number, user_id, notes }) {
        // Validation
        if (!item_id || !quantity || !location_id) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Missing required fields' };
        }
        if (quantity <= 0) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Quantity must be positive' };
        }

        const item = items.find(i => i.id === item_id);
        if (!item) throw { status: 404, code: 'NOT_FOUND', message: 'Item not found' };

        const location = locations.find(l => l.id === location_id);
        if (!location) throw { status: 404, code: 'NOT_FOUND', message: 'Location not found' };

        // Execute Transaction (Simulated)
        const movement = {
            id: `mov_${Date.now()}`,
            item_id,
            from_location_id: null,
            to_location_id: location_id,
            quantity,
            movement_type: 'receipt',
            user_id: user_id || 'sys_user',
            reference_number,
            notes,
            created_at: new Date().toISOString()
        };

        inventory_movements.push(movement);
        return movement;
    }

    // 2. Stock Out
    static async consumeStock({ item_id, quantity, location_id, reason_code, reference_number, user_id }) {
        // Validation
        if (!item_id || !quantity || !location_id) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Missing required fields' };
        }
        if (quantity <= 0) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Quantity must be positive' };
        }

        const item = items.find(i => i.id === item_id);
        if (!item) throw { status: 404, code: 'NOT_FOUND', message: 'Item not found' };

        const location = locations.find(l => l.id === location_id);
        if (!location) throw { status: 404, code: 'NOT_FOUND', message: 'Location not found' };

        // Check Availability
        const currentStock = this.calculateStock(item_id, location_id);
        if (currentStock < quantity) {
            throw { 
                status: 400, 
                code: 'INSUFFICIENT_STOCK', 
                message: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}` 
            };
        }

        // Execute Transaction
        const movement = {
            id: `mov_${Date.now()}`,
            item_id,
            from_location_id: location_id,
            to_location_id: null,
            quantity,
            movement_type: 'consumption',
            user_id: user_id || 'sys_user',
            reference_number,
            notes: reason_code,
            created_at: new Date().toISOString()
        };

        inventory_movements.push(movement);
        return movement;
    }

    // 3. Transfer
    static async transferStock({ item_id, quantity, from_location_id, to_location_id, transfer_reason, user_id }) {
        // Validation
        if (!item_id || !quantity || !from_location_id || !to_location_id) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Missing required fields' };
        }
        if (quantity <= 0) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Quantity must be positive' };
        }
        if (from_location_id === to_location_id) {
            throw { status: 400, code: 'VALIDATION_ERROR', message: 'Source and destination must be different' };
        }

        const item = items.find(i => i.id === item_id);
        if (!item) throw { status: 404, code: 'NOT_FOUND', message: 'Item not found' };

        const fromLoc = locations.find(l => l.id === from_location_id);
        if (!fromLoc) throw { status: 404, code: 'NOT_FOUND', message: 'Source Location not found' };

        const toLoc = locations.find(l => l.id === to_location_id);
        if (!toLoc) throw { status: 404, code: 'NOT_FOUND', message: 'Destination Location not found' };

        // Check Source Availability
        const currentStock = this.calculateStock(item_id, from_location_id);
        if (currentStock < quantity) {
            throw { 
                status: 400, 
                code: 'INSUFFICIENT_STOCK', 
                message: `Insufficient stock at source. Available: ${currentStock}, Requested: ${quantity}` 
            };
        }

        // Execute Atomic Transaction
        // In a real DB, this would be wrapped in BEGIN...COMMIT
        const movement = {
            id: `mov_${Date.now()}`,
            item_id,
            from_location_id,
            to_location_id,
            quantity,
            movement_type: 'transfer',
            user_id: user_id || 'sys_user',
            notes: transfer_reason,
            created_at: new Date().toISOString()
        };

        inventory_movements.push(movement);
        return movement;
    }

    // Helper: Calculate Real-time Stock
    static calculateStock(item_id, location_id) {
        return inventory_movements.reduce((acc, mov) => {
            if (mov.item_id !== item_id) return acc;
            
            if (mov.to_location_id === location_id) {
                return acc + mov.quantity;
            }
            if (mov.from_location_id === location_id) {
                return acc - mov.quantity;
            }
            return acc;
        }, 0);
    }
}

// --- Controller Layer ---

class InventoryController {
    static async handleStockIn(req) {
        try {
            const result = await InventoryService.receiveStock(req.body);
            return { status: 201, body: result };
        } catch (err) {
            return this.formatError(err);
        }
    }

    static async handleStockOut(req) {
        try {
            const result = await InventoryService.consumeStock(req.body);
            return { status: 201, body: result };
        } catch (err) {
            return this.formatError(err);
        }
    }

    static async handleTransfer(req) {
        try {
            const result = await InventoryService.transferStock(req.body);
            return { status: 201, body: result };
        } catch (err) {
            return this.formatError(err);
        }
    }

    static formatError(err) {
        const status = err.status || 500;
        return {
            status,
            body: {
                error: {
                    code: err.code || 'INTERNAL_ERROR',
                    message: err.message || 'An unexpected error occurred'
                }
            }
        };
    }
}

module.exports = { InventoryController, InventoryService };
