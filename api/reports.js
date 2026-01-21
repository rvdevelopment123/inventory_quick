
const { InventoryService } = require('./inventory');
const { CsvExporter } = require('./utils/csv');

// Mock Database Service (reusing existing pattern)
class ReportService {
    constructor() {
        this.db = {
            // Simulated query execution
            query: async (sql, params) => {
                // In a real app, this would execute the SQL against Postgres
                // For this simulation, we return mock data based on the query type
                
                if (sql.includes('current_inventory_snapshot')) {
                    // Mock On-Hand Data
                    return [
                        { location: 'Main Warehouse', sku: 'ING-001', name: 'Flour', on_hand: 150, unit: 'bag' },
                        { location: 'Secondary Storage', sku: 'ING-001', name: 'Flour', on_hand: 20, unit: 'bag' }
                    ];
                }
                
                if (sql.includes('inventory_movements')) {
                    // Mock Movement History
                    return [
                        { date: '2023-10-25 10:00', type: 'receipt', item: 'Flour', qty: 100, from: null, to: 'Main Warehouse' },
                        { date: '2023-10-26 14:00', type: 'transfer', item: 'Flour', qty: 20, from: 'Main Warehouse', to: 'Secondary Storage' }
                    ];
                }

                if (sql.includes('mv_weekly_inventory_summary') || sql.includes('mv_monthly_inventory_summary')) {
                     // Mock Summary Data
                    return [
                        { period: '2023-W43', item: 'Flour', incoming: 100, outgoing: 25, net_change: 75 },
                        { period: '2023-W43', item: 'Sugar', incoming: 50, outgoing: 0, net_change: 50 }
                    ];
                }

                return [];
            }
        };
    }

    async getOnHandInventory(filters) {
        // Construct SQL (demonstration of logic, not actual execution in this mock)
        const sql = `
            SELECT l.name as location, i.sku, i.name, cis.on_hand_quantity as on_hand, i.unit_of_measure as unit
            FROM current_inventory_snapshot cis
            JOIN items i ON cis.item_id = i.id
            JOIN locations l ON cis.location_id = l.id
            WHERE 1=1 
            ${filters.location_id ? `AND cis.location_id = $1` : ''}
        `;
        return await this.db.query(sql, [filters.location_id]);
    }

    async getMovementHistory(filters) {
        const sql = `
            SELECT created_at, movement_type, i.name, quantity, fl.name as from_loc, tl.name as to_loc
            FROM inventory_movements im
            JOIN items i ON im.item_id = i.id
            LEFT JOIN locations fl ON im.from_location_id = fl.id
            LEFT JOIN locations tl ON im.to_location_id = tl.id
            WHERE created_at BETWEEN $1 AND $2
        `;
        return await this.db.query(sql, [filters.start_date, filters.end_date]);
    }

    async getWeeklySummary(weekStart) {
         const sql = `SELECT * FROM mv_weekly_inventory_summary WHERE week_start = $1`;
         return await this.db.query(sql, [weekStart]);
    }

    async getMonthlySummary(month) {
        const sql = `SELECT * FROM mv_monthly_inventory_summary WHERE month_start = $1`;
        return await this.db.query(sql, [month]);
    }
}

class ReportController {
    constructor() {
        this.service = new ReportService();
    }

    async handleRequest(req, res) {
        try {
            const url = new URL(req.url, 'http://localhost');
            const path = url.pathname;
            const params = Object.fromEntries(url.searchParams);
            const format = params.format || 'json';

            let data = [];
            let metadata = { generated_at: new Date().toISOString() };

            if (path === '/v1/reports/inventory/on-hand') {
                data = await this.service.getOnHandInventory(params);
            } else if (path === '/v1/reports/inventory/movement') {
                if (!params.start_date || !params.end_date) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'start_date and end_date required' }));
                }
                data = await this.service.getMovementHistory(params);
            } else if (path === '/v1/reports/inventory/summary/weekly') {
                if (!params.week_start_date) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'week_start_date required' }));
                }
                data = await this.service.getWeeklySummary(params.week_start_date);
            } else if (path === '/v1/reports/inventory/summary/monthly') {
                if (!params.month) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'month (YYYY-MM) required' }));
                }
                data = await this.service.getMonthlySummary(params.month);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Report not found' }));
            }

            if (format === 'csv') {
                const csv = CsvExporter.toCsv(data);
                res.writeHead(200, { 
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="report.csv"'
                });
                res.end(csv);
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ metadata, data }));
            }

        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    }
}

module.exports = { ReportController, ReportService };
