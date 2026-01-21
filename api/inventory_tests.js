
const { InventoryController } = require('./inventory');

// Mock Request/Response helpers
class MockRequest {
    constructor(body = {}, user = { id: 1, role: 'user' }) {
        this.body = body;
        this.user = user;
    }
}

class MockResponse {
    constructor() {
        this.statusCode = 200;
        this.body = null;
    }

    status(code) {
        this.statusCode = code;
        return this;
    }

    json(data) {
        this.body = data;
        return this;
    }
}

async function runTests() {
    console.log("Running Inventory API Tests...\n");
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    const controller = new InventoryController();

    // ==========================================
    // Test 1: Stock In - Success
    // ==========================================
    console.log("\nTest 1: Stock In - Success");
    let req = new MockRequest({
        item_id: 1,
        location_id: 1,
        quantity: 100,
        reference_number: "PO-TEST-100"
    });
    let res = new MockResponse();

    await controller.stockIn(req, res);
    assert(res.statusCode === 201, "Status code should be 201");
    assert(res.body.data.movement_type === 'receipt', "Movement type should be receipt");

    // ==========================================
    // Test 2: Stock In - Validation Failure (Negative Qty)
    // ==========================================
    console.log("\nTest 2: Stock In - Validation Failure");
    req = new MockRequest({
        item_id: 1,
        location_id: 1,
        quantity: -10
    });
    res = new MockResponse();

    await controller.stockIn(req, res);
    assert(res.statusCode === 400, "Status code should be 400");
    assert(res.body.error.code === 'VALIDATION_ERROR', "Error code should be VALIDATION_ERROR");

    // ==========================================
    // Test 3: Transfer - Success
    // ==========================================
    console.log("\nTest 3: Transfer - Success");
    req = new MockRequest({
        item_id: 1,
        from_location_id: 1,
        to_location_id: 2,
        quantity: 20,
        transfer_reason: "Distribution"
    });
    res = new MockResponse();

    await controller.transfer(req, res);
    assert(res.statusCode === 201, "Status code should be 201");
    assert(res.body.data.movement_type === 'transfer', "Movement type should be transfer");

    // ==========================================
    // Test 4: Transfer - Insufficient Stock (Mocked)
    // ==========================================
    console.log("\nTest 4: Transfer - Insufficient Stock");
    // Note: Since we are mocking the DB, we can't easily test state unless we update the mock logic.
    // In our api/inventory.js, we simulated a check that throws if quantity > 1000.
    req = new MockRequest({
        item_id: 1,
        from_location_id: 1,
        to_location_id: 2,
        quantity: 5000 // Exceeds mock limit
    });
    res = new MockResponse();

    await controller.transfer(req, res);
    assert(res.statusCode === 400, "Status code should be 400");
    assert(res.body.error.message.includes('Insufficient'), "Should return insufficient stock error");

    // ==========================================
    // Test 5: Stock Out - Success
    // ==========================================
    console.log("\nTest 5: Stock Out - Success");
    req = new MockRequest({
        item_id: 1,
        location_id: 1,
        quantity: 5,
        reason_code: "damaged",
        reference_number: "DMG-001"
    });
    res = new MockResponse();

    await controller.stockOut(req, res);
    assert(res.statusCode === 201, "Status code should be 201");
    assert(res.body.data.movement_type === 'consumption', "Movement type should be consumption");

    // ==========================================
    // Summary
    // ==========================================
    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
}

runTests().catch(console.error);
