# Item Management API Specification

## Base URL
`/api/v1`

## Endpoints

### 1. GET /items
Retrieve a paginated list of items with optional filtering and sorting.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20)
- `name` (string): Filter by name (partial match)
- `category` (string): Filter by category
- `type` (enum): Filter by type (`ingredient`, `finished_good`)
- `status` (enum): Filter by status (`active`, `inactive`)
- `sort_by` (string): Field to sort by (`name`, `created_at`) (default: `name`)
- `order` (string): Sort order (`asc`, `desc`) (default: `asc`)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "item_123",
      "sku": "ING-001",
      "name": "Flour",
      "category": "Baking",
      "unit_of_measure": "kg",
      "type": "ingredient",
      "status": "active",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "pages": 1
  }
}
```

### 2. POST /items
Create a new inventory item.

**Request Body:**
```json
{
  "sku": "ING-005",
  "name": "Salt",
  "category": "Seasoning",
  "unit_of_measure": "kg",
  "type": "ingredient"
}
```

**Validation:**
- `sku`: Required, Unique
- `name`: Required, Min 2, Max 100 chars
- `category`: Required, Min 2, Max 50 chars
- `unit_of_measure`: Required (Enum: kg, g, l, ml, pcs, bag, case)
- `type`: Required (Enum: ingredient, finished_good)
- Unique (name + category)

**Response (201 Created):**
Returns the created item object.

### 3. PUT /items/:id
Update an existing item.

**Request Body:**
Partial update supported.
```json
{
  "name": "Sea Salt",
  "category": "Premium Seasoning"
}
```

**Restrictions:**
- Cannot update `status` (must use DELETE endpoint).
- Cannot update archived (`inactive`) items.

**Response (200 OK):**
Returns the updated item object.

### 4. DELETE /items/:id
Soft delete an item.

**Response (200 OK):**
```json
{
  "message": "Item archived successfully",
  "id": "item_123"
}
```

## Error Handling

**Format:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Common Codes:**
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `CONFLICT` (409) - e.g., Duplicate SKU or Name+Category
