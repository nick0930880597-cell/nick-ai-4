# Quote Generator Integration Workflow

This document describes how the **`quote safety.md`** checks and the **`quote_generator`** skill are combined to produce an **intelligent PDF quotation system** that can be triggered from LINE.

---
## 1. High‑Level Flow
```mermaid
flowchart TD
    A[LINE Bot receives sales message] --> B{Parse intent}
    B -->|Quote request| C[quote_generator Skill]
    C --> D[Generate preliminary JSON]
    D --> E[quote safety.md checks]
    E -->|Pass| F[Google Apps Script (GAS) – generate PDF]
    E -->|Fail| G[Return error message to LINE]
    F --> H[Upload PDF to Drive]
    H --> I[Get shareable URL]
    I --> J[Send PDF link & customer‑facing message to LINE]
```

---
## 2. Detailed Steps
1. **LINE Bot** forwards the raw text (already validated as an authorized salesperson) to the Antigravity Agent.
2. **Intent Parsing** extracts `customer_name`, `keyword`, `qty`, and `is_asking_cost` (see `quote_generator` SOP).
3. **Quote Generator** computes:
   - Discount rate (based on tier, with a floor of **9 折** for ≥5 units).
   - Unit price after discount, subtotal, tax (5 %), total, and `stock_note`.
4. **Safety Checks** (`quote safety.md`):
   - Verify tax rate = 5 %.
   - Ensure discount floor is applied.
   - Validate stock availability and lead‑time logic.
   - Enforce amount limits (≤ NT$5M per line‑item, ≤ NT$10M total).  
   - If any check fails, a structured error JSON is returned (e.g., `{error: "Discount Floor Violation"}`).
5. **If all checks pass**, the JSON is handed to a **Google Apps Script** function (`generatePdfQuote(json)`).
   - The script builds an HTML template, fills values with the JSON, and calls `HtmlService.createHtmlOutput(...).getAs('application/pdf')`.
   - The PDF is saved to a designated Drive folder and a shareable link is created.
6. **Return to LINE Bot**:
   - Send the **customer‑facing message** (see `quote_generator` skill).
   - Attach the PDF link.
7. **Logging & Auditing** – Every request and approval status is logged to a protected Google Sheet (or Firestore) as defined in `quote_safety.md`.

---
## 3. Key Parameters (passed to GAS)
```json
{
  "customer_name": "XXX 公司",
  "keyword": "CNC‑L200",
  "qty": 3,
  "unit_price": 120000,
  "subtotal": 360000,
  "tax": 18000,
  "total": 378000,
  "stock_note": "✅ 現貨充足（庫存 8 台），下單後 7 個工作天內安排出機",
  "is_asking_cost": false
}
```

---
## 4. Error Handling
| Error Type | Message sent to salesperson | Additional Action |
|------------|---------------------------|-------------------|
| Tax Mismatch | "報價計算稅金異常，請聯絡管理員。" | Log & abort |
| Discount Floor Violation | "大單最低折扣為 9 折，已自動套用。請確認。" | Auto‑apply floor |
| Stock Shortage | `stock_note` already contains warning; order proceeds. |
| High‑Value Order | "金額超過授權上限，需經主管批准。" | Create approval task |

---
### Usage Example
```javascript
// In your LINE webhook handler (Node.js)
const quoteJson = await invokeSkill('quote_generator', messageText);
const safeJson = await invokeSkill('quote_safety', quoteJson);
if (safeJson.error) {
  replyToLine(safeJson.message);
} else {
  const pdfUrl = await AppsScript.run('generatePdfQuote', safeJson);
  replyToLine(customerMessage(safeJson) + "\nPDF: " + pdfUrl);
}
```

---
*The workflow above can be directly copy‑pasted into your Antigravity project or documented for future developers.*