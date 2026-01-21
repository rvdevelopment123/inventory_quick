const assert = require('assert');
const catController = require('./categories');
const locController = require('./locations');
const typeController = require('./item_types');

async function runTests() {
    console.log('Running CRUD Tests...');
    
    try {
        // 1. Category Tests
        console.log('Testing Categories...');
        const catService = catController.service;
        const newCat = await catService.create({ name: 'Test Cat ' + Date.now(), description: 'Test' }, 1);
        assert(newCat.id, 'Category created');
        
        const updatedCat = await catService.update(newCat.id, { description: 'Updated' }, 1);
        assert.strictEqual(updatedCat.description, 'Updated', 'Category updated');
        
        await catService.delete(newCat.id, 1);
        // Verify soft delete logic (getAll excludes archived)
        const allCats = await catService.getAll({ name: newCat.name });
        assert.strictEqual(allCats.data.length, 0, 'Category soft deleted');

        // 2. Location Tests
        console.log('Testing Locations...');
        const locService = locController.service;
        const newLoc = await locService.create({ 
            name: 'Test Loc ' + Date.now(), 
            address: '123 Test St', 
            latitude: 10.0, 
            longitude: 20.0 
        }, 1);
        assert(newLoc.id, 'Location created');
        assert.strictEqual(newLoc.version, 1, 'Version initialized');

        const updatedLoc = await locService.update(newLoc.id, { name: 'Updated Loc ' + Date.now() }, 1);
        assert.strictEqual(updatedLoc.version, 2, 'Version incremented');

        // 3. Item Type Tests
        console.log('Testing Item Types...');
        const typeService = typeController.service;
        const newType = await typeService.create({
            name: 'Test Type ' + Date.now(),
            schema_definition: { field: 'string' }
        }, 1);
        assert(newType.id, 'Item Type created');
        
        // Cache Test
        console.log('Testing Item Type Caching...');
        const cachedType = await typeService.getById(newType.id);
        assert.strictEqual(cachedType.name, newType.name, 'Cache hit successful');

        console.log('All CRUD Tests Passed!');
        process.exit(0);
    } catch (err) {
        console.error('Tests Failed:', err);
        process.exit(1);
    }
}

runTests();
