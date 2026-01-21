const assert = require('assert');
const { ReportController } = require('./reports');

// Mock Request/Response
class MockRequest {
    constructor(url, method = 'GET') {
        this.url = url;
        this.method = method;
        this.headers = {};
    }
}

class MockResponse {
    constructor() {
        this.statusCode = 200;
        this.headers = {};
        this.body = '';
    }

    writeHead(code, headers) {
        this.statusCode = code;
        this.headers = headers;
    }

    end(data) {
        this.body = data;
    }
}

async function runTests() {
    console.log('Starting Reports API Tests...');
    const controller = new ReportController();

    // Test 1: On-Hand Inventory (JSON)
    {
        console.log('Test 1: On-Hand Inventory (JSON)...');
        const req = new MockRequest('/v1/reports/inventory/on-hand');
        const res = new MockResponse();
        
        await controller.handleRequest(req, res);
        
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.headers['Content-Type'], 'application/json');
        const json = JSON.parse(res.body);
        assert(json.data.length > 0);
        assert(json.data[0].location);
        console.log('PASS');
    }

    // Test 2: On-Hand Inventory (CSV)
    {
        console.log('Test 2: On-Hand Inventory (CSV)...');
        const req = new MockRequest('/v1/reports/inventory/on-hand?format=csv');
        const res = new MockResponse();
        
        await controller.handleRequest(req, res);
        
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.headers['Content-Type'], 'text/csv');
        assert(res.body.includes('location,sku,name,on_hand,unit')); // Check header
        assert(res.body.includes('Main Warehouse')); // Check data
        console.log('PASS');
    }

    // Test 3: Movement History (Validation Error)
    {
        console.log('Test 3: Movement History Validation...');
        const req = new MockRequest('/v1/reports/inventory/movement'); // Missing dates
        const res = new MockResponse();
        
        await controller.handleRequest(req, res);
        
        assert.strictEqual(res.statusCode, 400);
        const json = JSON.parse(res.body);
        assert.strictEqual(json.error, 'start_date and end_date required');
        console.log('PASS');
    }

    // Test 4: Movement History (Success)
    {
        console.log('Test 4: Movement History (Success)...');
        const req = new MockRequest('/v1/reports/inventory/movement?start_date=2023-01-01&end_date=2023-12-31');
        const res = new MockResponse();
        
        await controller.handleRequest(req, res);
        
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(res.body);
        assert(json.data.length > 0);
        console.log('PASS');
    }

    // Test 5: Weekly Summary (Success)
    {
        console.log('Test 5: Weekly Summary...');
        const req = new MockRequest('/v1/reports/inventory/summary/weekly?week_start_date=2023-10-23');
        const res = new MockResponse();
        
        await controller.handleRequest(req, res);
        
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(res.body);
        assert(json.data[0].period === '2023-W43');
        console.log('PASS');
    }

    console.log('All Report Tests Passed!');
}

runTests().catch(console.error);
