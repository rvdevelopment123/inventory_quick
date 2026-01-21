// Mock database client for testing purposes
const db = {
    // In-memory store for items (initialized with seed data from schema)
    items: [
        {
            id: 1,
            sku: 'ING-001',
            name: 'Flour - All Purpose',
            description: '50lb bag of AP flour',
            unit_of_measure: 'bag',
            category: 'Baking',
            type: 'ingredient',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ],
    nextId: 2,

    // Helper to simulate DB query delay
    async query(sql, params) {
        return new Promise(resolve => setTimeout(() => resolve(this._mockExecute(sql, params)), 10));
    },

    _mockExecute(sql, params) {
        // Very basic mock logic to support the tests
        if (sql.includes('SELECT') && sql.includes('items')) {
            let results = [...this.items];
            
            // Handle ID lookup
            if (params && params.length === 1 && typeof params[0] === 'number') {
                const item = results.find(i => i.id === params[0]);
                return { rows: item ? [item] : [] };
            }
            
            // Handle Filters (Mock implementation)
            // Note: In a real app, this would be SQL. Here we filter the array.
            // This is just to make the unit tests run without a real Postgres instance.
            return { rows: results, rowCount: results.length };
        }

        if (sql.includes('INSERT')) {
            const newItem = {
                id: this.nextId++,
                ...params, // This is simplified, real SQL parsing is harder
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            // Map params roughly to object for test
            // (In reality we'd map $1, $2 etc.)
            // For the specific INSERT in items.js:
            // $1=sku, $2=name, $3=desc, $4=uom, $5=cat, $6=type, $7=status
            const created = {
                id: this.nextId++,
                sku: params[0],
                name: params[1],
                description: params[2],
                unit_of_measure: params[3],
                category: params[4],
                type: params[5],
                status: params[6],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.items.push(created);
            return { rows: [created] };
        }

        if (sql.includes('UPDATE')) {
            // Simplified update mock
            const id = params[params.length - 1]; // ID is usually last param
            const itemIndex = this.items.findIndex(i => i.id === id);
            if (itemIndex > -1) {
                // Merge updates
                // This is tricky to mock generically without a parser, 
                // so we'll just return the existing item "updated" for the test pass
                // or specific logic if needed.
                const updated = { ...this.items[itemIndex], updated_at: new Date().toISOString() };
                this.items[itemIndex] = updated;
                return { rows: [updated], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        return { rows: [] };
    }
};

const ItemsController = require('./items');

async function runTests() {
    console.log('Starting API Tests...\n');

    const reqMock = (method, url, body = {}, query = {}, params = {}) => ({
        method, url, body, query, params
    });

    const resMock = () => {
        const res = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.body = data; return this; }
        };
        return res;
    };

    // 1. Test GET /items (List)
    console.log('Test 1: GET /items');
    const req1 = reqMock('GET', '/items');
    const res1 = resMock();
    await ItemsController.getItems(req1, res1);
    
    if (res1.statusCode === 200 && res1.body.data.length > 0) {
        console.log('PASS: Retrieved items list');
    } else {
        console.error('FAIL: Could not retrieve items', res1.body);
    }

    // 2. Test POST /items (Create)
    console.log('\nTest 2: POST /items (Success)');
    const newItem = {
        name: 'Sugar',
        category: 'Baking',
        unit_of_measure: 'kg',
        type: 'ingredient',
        sku: 'ING-TEST-002',
        description: 'Test Sugar'
    };
    const req2 = reqMock('POST', '/items', newItem);
    const res2 = resMock();
    await ItemsController.createItem(req2, res2);

    if (res2.statusCode === 201 && res2.body.name === 'Sugar') {
        console.log('PASS: Created new item');
    } else {
        console.error('FAIL: Could not create item', res2.body);
    }

    // 3. Test POST /items (Validation Error)
    console.log('\nTest 3: POST /items (Validation Error - Missing Name)');
    const invalidItem = {
        category: 'Baking',
        unit_of_measure: 'kg'
    };
    const req3 = reqMock('POST', '/items', invalidItem);
    const res3 = resMock();
    await ItemsController.createItem(req3, res3);

    if (res3.statusCode === 400 && res3.body.error.code === 'VALIDATION_ERROR') {
        console.log('PASS: Caught validation error');
    } else {
        console.error('FAIL: Validation check failed', res3.body);
    }

    // 4. Test DELETE /items/:id (Soft Delete)
    console.log('\nTest 4: DELETE /items/:id (Soft Delete)');
    // Assume ID 1 exists from mock
    const req4 = reqMock('DELETE', '/items/1', {}, {}, { id: 1 });
    const res4 = resMock();
    await ItemsController.deleteItem(req4, res4);

    if (res4.statusCode === 200 && res4.body.status === 'inactive') {
        console.log('PASS: Item soft deleted');
    } else {
        console.error('FAIL: Soft delete failed', res4.body);
    }
}

runTests().catch(console.error);
