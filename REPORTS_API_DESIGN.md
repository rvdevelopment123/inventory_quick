# Reports API Design Specification

## 1. Overview
This API provides comprehensive inventory reporting capabilities including real-time stock levels, movement history, and aggregated summaries.

## 2. Authentication
All endpoints require Bearer Token Authentication.
`Authorization: Bearer <token>`

## 3. Endpoints

### 3.1 On-Hand Inventory
**GET /v1/reports/inventory/on-hand**

Retrieves current stock levels grouped by location and product.

**Parameters:**
- `location_id` (optional, integer): Filter by specific location.
- `as_of_date` (optional, date string YYYY-MM-DD): Get inventory snapshot at specific date.
- `format` (optional, string): 'json' (default) or 'csv'.
- `page` (optional, int): Page number.
- `limit` (optional, int): Items per page.

**Response (JSON):**
```json
{
  "meta": {
    "generated_at": "2023-10-27T10:00:00Z",
    "total_records": 45,
    "page": 1,
    "limit": 20
  },
  "data": [
    {
      "location_name": "Main Warehouse",
      "item_sku": "ING-001",
      "item_name": "Flour - All Purpose",
      "quantity": 150,
      "unit": "bag",
      "value": 1500.00
    }
  ]
}
```

### 3.2 Inventory Movement History
**GET /v1/reports/inventory/movement**

Retrieves chronological record of inventory transactions.

**Parameters:**
- `start_date` (required, date string): YYYY-MM-DD
- `end_date` (required, date string): YYYY-MM-DD
- `location_id` (optional, integer)
- `item_id` (optional, integer)
- `format` (optional, string): 'json' or 'csv'

**Response (JSON):**
```json
{
  "meta": { "generated_at": "...", "count": 10 },
  "data": [
    {
      "date": "2023-10-26T14:30:00Z",
      "type": "receipt",
      "item_name": "Sugar",
      "location": "Main Warehouse",
      "quantity": 50,
      "user": "admin",
      "reference": "PO-123"
    }
  ]
}
```

### 3.3 Weekly Summary
**GET /v1/reports/inventory/summary/weekly**

**Parameters:**
- `week_start_date` (required, date string): YYYY-MM-DD
- `location_id` (optional)
- `format` (optional)

**Response (JSON):**
```json
{
  "meta": { "period": "2023-W43" },
  "data": [
    {
      "item_name": "Flour",
      "opening_stock": 100,
      "received": 50,
      "consumed": 20,
      "closing_stock": 130
    }
  ]
}
```

### 3.4 Monthly Summary
**GET /v1/reports/inventory/summary/monthly**

**Parameters:**
- `month` (required, string): YYYY-MM
- `location_id` (optional)
- `format` (optional)

**Response (JSON):**
Similar structure to Weekly Summary but aggregated by month.

## 4. Error Handling
- **400 Bad Request**: Missing required params or invalid format.
- **401 Unauthorized**: Invalid or missing token.
- **403 Forbidden**: User lacks permission.
- **500 Internal Server Error**: Database query failure.

Example Error:
```json
{
  "error": {
    "code": "INVALID_DATE_FORMAT",
    "message": "start_date must be in YYYY-MM-DD format"
  }
}
```
