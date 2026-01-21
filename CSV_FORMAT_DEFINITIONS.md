# CSV Format Definitions

This document details the CSV structure for the three supported report types. All reports are generated with UTF-8 encoding and include a BOM for Excel compatibility.

## 1. Monthly Inventory Summary
**Purpose:** Provides a high-level overview of inventory value and item counts by month.

**Filename Pattern:** `monthly_summary_YYYY-MM.csv`

| Column Name | Data Type | Description | Formatting Rules |
| :--- | :--- | :--- | :--- |
| `period` | String | Reporting period | YYYY-MM |
| `category` | String | Item Category | Text |
| `total_items` | Integer | Count of distinct SKUs | Number |
| `total_quantity` | Integer | Sum of all stock quantities | Number |
| `inventory_value` | Decimal | Total monetary value | 2 decimal places (1234.56) |

## 2. Weekly Inventory Snapshot
**Purpose:** Captures the current stock levels with detailed item information.

**Filename Pattern:** `weekly_snapshot_YYYY-WW.csv`

| Column Name | Data Type | Description | Formatting Rules |
| :--- | :--- | :--- | :--- |
| `sku` | String | Stock Keeping Unit | Text |
| `item_name` | String | Name of the item | Text |
| `category` | String | Item Category | Text |
| `location` | String | Storage Location | Text |
| `quantity` | Integer | Current On-Hand | Number |
| `unit` | String | Unit of Measure | Text (kg, pcs, etc.) |
| `snapshot_date` | Date | Date of snapshot | YYYY-MM-DD |

## 3. Movement History
**Purpose:** Detailed audit trail of all inventory transactions.

**Filename Pattern:** `movement_history_START_END.csv`

| Column Name | Data Type | Description | Formatting Rules |
| :--- | :--- | :--- | :--- |
| `transaction_id` | String | Unique ID | Text |
| `timestamp` | DateTime | Time of transaction | YYYY-MM-DD HH:mm:ss |
| `type` | String | Movement Type | Enum (receipt, transfer, consumption) |
| `item_name` | String | Name of the item | Text |
| `from_location` | String | Source Location | Text (or empty for receipt) |
| `to_location` | String | Destination Location | Text (or empty for consumption) |
| `quantity` | Integer | Quantity Moved | Number |
| `reference` | String | Ref Number (PO/Order) | Text |
