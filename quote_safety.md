# Quote Safety Rules

This document defines the safety checks that must be performed **before** a quotation is generated and sent to a customer.  The checks are applied by the `quote safety.md` component and are invoked automatically by the integrated workflow.

## 1. Tax Rate Validation
- **Allowed tax rates**: 5 % (standard). Any other tax rate must be manually approved by a manager.
- The tax amount (`tax`) is calculated as `Math.round(subtotal * 0.05)`.
- The final `total` must equal `subtotal + tax`. Any discrepancy triggers a **Tax Mismatch** error.

## 2. Discount Floor (Large Order Minimum Discount)
- **Discount tiers** (as defined in `quote_generator`):
  - 1 台 → 1.00 (no discount)
  - 2‑4 台 → 0.95
  - **≥ 5 台 → 0.90** (minimum discount floor).
- The system must enforce that **any order of 5 台 or more** automatically receives the 9 折 rate, regardless of custom discount inputs.
- If a user tries to specify a discount lower than the floor, the request is rejected with a **Discount Floor Violation**.

## 3. Stock Availability & Lead‑time Logic
- `available_stock` is fetched from the ERP / Google Sheet before quotation.
- **Sufficient stock** (`available_stock >= qty`):
  - `stock_note` = "✅ 現貨充足（庫存 X 台），下單後 7 個工作天內安排出機".
- **Insufficient stock** (`available_stock < qty`):
  - The system **allows** the order but **adds** a lead‑time extension of **45 工作天**.
  - `stock_note` = "⚠️ 現貨不足（目前僅剩 X 台），不足台數需排產 45 個工作天".
- If `available_stock` is **0**, the order is flagged as **Critical Stock Shortage**, and a manager approval step is inserted.

## 4. Amount Limits
- **Maximum line‑item amount** (unit price * qty) must not exceed **NT$5,000,000**. Exceeding this triggers a **High‑Value Order** warning that requires a senior manager’s sign‑off.
- **Grand total** (`total`) must not surpass **NT$10,000,000** without additional approval.

## 5. Auditing
- Every quotation request is logged with the following fields: `request_id`, `timestamp`, `user_id`, `customer_name`, `keyword`, `qty`, `unit_price`, `discount_rate`, `subtotal`, `tax`, `total`, `stock_note`, `is_asking_cost`, and `approval_status`.
- Logs are stored in a protected Google Sheet (or Cloud Firestore) with write‑only access for the quoting bot.

---
*These rules are referenced by the integration workflow defined in `quote_generator_integration.md`.*