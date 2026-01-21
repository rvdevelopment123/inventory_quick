# System Acceptance Checklist

This document outlines the validation criteria and test cases required to verify the completeness and correctness of the Inventory Management System.

**Tester Name:** ___________________  
**Date:** ___________________  
**Environment:** [ ] Staging [ ] Production  

## 1. Stock In Operations

**Objective:** Verify that inventory receiving processes correctly update stock levels and record transaction details.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SI-01** | Verify Stock In Increases Inventory | Item "Flour" has 0 qty in "Main Warehouse" | 1. Navigate to **Operations** > **Stock In**.<br>2. Select Item: "Flour".<br>3. Enter Qty: 100.<br>4. Select Location: "Main Warehouse".<br>5. Click **Process Transaction**. | - Success notification displayed.<br>- "Flour" qty in "Main Warehouse" is now 100. | |
| **SI-02** | Validate Required Fields | N/A | 1. Navigate to **Operations** > **Stock In**.<br>2. Leave all fields empty.<br>3. Click **Process Transaction**. | - Form validation errors appear.<br>- Transaction is NOT submitted. | |
| **SI-03** | Verify Transaction History Recording | SI-01 completed | 1. Check database `inventory_movements` table (or Reports). | - New record exists with type `receipt`.<br>- `quantity` is 100.<br>- `to_location_id` matches "Main Warehouse". | |
| **SI-04** | Verify Stock In Accumulation | Item "Sugar" has 50 qty | 1. Perform Stock In of 25 "Sugar" to same location. | - Total qty becomes 75.<br>- No errors occur. | |

## 2. Stock Out Operations

**Objective:** Verify that inventory consumption processes correctly decrease stock levels and enforce availability.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SO-01** | Verify Stock Out Decreases Inventory | Item "Flour" has 100 qty | 1. Navigate to **Operations** > **Stock Out**.<br>2. Select Item: "Flour".<br>3. Enter Qty: 20.<br>4. Select Source: "Main Warehouse".<br>5. Enter Reason: "Production".<br>6. Click **Process Transaction**. | - Success notification displayed.<br>- "Flour" qty drops to 80. | |
| **SO-02** | Validate Mandatory Reason Code | N/A | 1. Attempt Stock Out without entering a "Reason". | - Validation error: "Reason is required".<br>- Transaction blocked. | |
| **SO-03** | Verify Deduction from Correct Location | "Flour" exists in "Main Warehouse" (80) and "Secondary" (0) | 1. Attempt Stock Out of 10 "Flour" from "Secondary". | - Error: "Insufficient stock" (since Secondary has 0).<br>- "Main Warehouse" stock remains 80. | |

## 3. Inventory Transfers

**Objective:** Confirm accurate movement of stock between locations with atomic updates.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TR-01** | Verify Successful Transfer | "Main Warehouse": 80 Flour<br>"Secondary": 0 Flour | 1. Navigate to **Operations** > **Transfer**.<br>2. Source: "Main Warehouse".<br>3. Destination: "Secondary".<br>4. Qty: 30.<br>5. Click **Process Transaction**. | - Success notification.<br>- "Main Warehouse": 50 Flour.<br>- "Secondary": 30 Flour. | |
| **TR-02** | Validate Source/Dest Distinction | N/A | 1. Select "Main Warehouse" for both Source and Destination. | - Error: "Source and destination must be different". | |
| **TR-03** | Verify Atomic Update | System running | 1. Perform TR-01.<br>2. Verify DB records. | - One transaction record created (type `transfer`).<br>- `from_location_id` and `to_location_id` are both set correctly. | |

## 4. Negative Inventory Prevention

**Objective:** Ensure strict constraints prevent inventory from dropping below zero.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NI-01** | Prevent Over-consumption | Item "Sugar" has 10 qty | 1. Attempt Stock Out of 15 "Sugar". | - Error message: "Insufficient stock. Available: 10, Requested: 15".<br>- Transaction rejected. | |
| **NI-02** | Prevent Over-transfer | Item "Sugar" has 10 qty | 1. Attempt Transfer of 15 "Sugar". | - Error message: "Insufficient stock at source".<br>- Transaction rejected. | |
| **NI-03** | Validate Zero Quantity | N/A | 1. Attempt any operation with Qty = 0 or negative. | - Validation error: "Quantity must be positive". | |

## 5. Report Validation

**Objective:** Verify accuracy and filtering of generated reports.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RP-01** | Verify Weekly Snapshot Accuracy | Known stock levels from previous tests | 1. Navigate to **Reports**.<br>2. Generate "Weekly Inventory Snapshot". | - Report lists all items with correct current quantities.<br>- Location breakdowns match DB. | |
| **RP-02** | Verify Movement History Log | Operations SI-01, SO-01, TR-01 performed | 1. Generate "Movement History".<br>2. Filter by Date Range (Today). | - Report includes exactly 3 transactions.<br>- Details (Type, Qty, Ref) match input data. | |
| **RP-03** | Verify Date Range Filtering | Transactions exist for Today and Last Month | 1. Filter Report for "Today". | - Only today's transactions appear.<br>- Old transactions are excluded. | |

## 6. CSV Functionality

**Objective:** Ensure data portability and format compatibility.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CV-01** | Excel Compatibility (BOM) | Report generated | 1. Open generated CSV in Microsoft Excel. | - Characters display correctly (UTF-8).<br>- No weird symbols at start of file.<br>- Columns align correctly. | |
| **CV-02** | Special Character Handling | Item created with name `Item "Special", Case` | 1. Include this item in a report.<br>2. Export to CSV.<br>3. Inspect raw CSV data. | - Field is escaped: `"Item ""Special"", Case"`.<br>- Opens correctly in Excel as one cell. | |
| **CV-03** | Verify Column Headers | N/A | 1. Check first row of "Monthly Summary" CSV. | - Headers match: `period,category,total_items,total_quantity,inventory_value`. | |

## 7. Scope Verification

**Objective:** Confirm adherence to approved requirements and exclusion of unapproved features.

| ID | Test Case | Pre-conditions | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SC-01** | Verify No QuickBooks Integration | System Codebase | 1. Search for QuickBooks API calls or settings. | - No "Connect to QuickBooks" buttons.<br>- No API dependencies in `package.json`. | |
| **SC-02** | Verify No User Registration | Login Screen | 1. Check Login screen for "Sign Up" link. | - No self-registration option exists (Admin creates users). | |
| **SC-03** | Verify Approved Report Types | Reports Screen | 1. Check available report options. | - Only "Monthly Summary", "Weekly Snapshot", and "Movement History" are present. | |

---

**Sign-off:**

_______________________ (QA Lead)  
_______________________ (Product Owner)
