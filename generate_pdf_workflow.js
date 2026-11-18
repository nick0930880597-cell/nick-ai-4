// Google Apps Script: generatePdfQuote.js
// This function receives the JSON produced by the quote_generator skill (after safety checks)
// and returns a shareable URL to the generated PDF.

/**
 * Generate a PDF quotation and return its shareable link.
 * @param {Object} data The quotation data JSON.
 * @return {string} The URL of the PDF file stored in Drive.
 */
function generatePdfQuote(data) {
  // 1️⃣ Build HTML template
  var html = HtmlService.createTemplateFromFile('QuoteTemplate');
  // Assign data fields to the template
  html.customerName = data.customer_name;
  html.keyword = data.keyword;
  html.qty = data.qty;
  html.unitPrice = data.unit_price;
  html.subtotal = data.subtotal;
  html.tax = data.tax;
  html.total = data.total;
  html.stockNote = data.stock_note;
  html.isAskingCost = data.is_asking_cost;
  var rendered = html.evaluate().getContent();

  // 2️⃣ Convert HTML to PDF Blob
  var blob = Utilities.newBlob(rendered, 'text/html')
                     .getAs('application/pdf')
                     .setName(data.customer_name + '_' + data.keyword + '_報價單.pdf');

  // 3️⃣ Save to a dedicated Drive folder (create if not exists)
  var folderName = 'Quotations';
  var folder = getOrCreateFolder(folderName);
  var file = folder.createFile(blob);

  // 4️⃣ Set sharing permissions (anyone with link can view)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 5️⃣ Return the shareable URL
  return file.getUrl();
}

/** Helper: get or create a folder by name under the script's root */
function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(name);
}

/* ==== QuoteTemplate.html ==== */
/*
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {font-family: "微軟正黑體", sans-serif; line-height: 1.5; padding: 20px;}
    h1 {text-align: center;}
    table {width: 100%; border-collapse: collapse; margin-top: 20px;}
    th, td {border: 1px solid #444; padding: 8px; text-align: left;}
    .right {text-align: right;}
  </style>
</head>
<body>
  <h1>報價單</h1>
  <p>客戶名稱：<?= customerName ?></p>
  <p>機台型號：<?= keyword ?></p>
  <p>需求數量：<?= qty ?> 台</p>
  <table>
    <tr><th>項目</th><th class="right">金額 (NT$)</th></tr>
    <tr><td>單價（折扣後）</td><td class="right"><?= unitPrice ?></td></tr>
    <tr><td>小計</td><td class="right"><?= subtotal ?></td></tr>
    <tr><td>營業稅 5%</td><td class="right"><?= tax ?></td></tr>
    <tr><th>合計（含稅）</th><th class="right"><?= total ?></th></tr>
  </table>
  <p>庫存說明：<?= stockNote ?></p>
  <? if (isAskingCost) { ?>
    <p><em>※ 本報價含成本資訊，僅供內部參考。</em></p>
  <? } ?>
  <p style="margin-top:30px;">感謝您的垂詢，若有任何問題歡迎隨時聯絡。</p>
</body>
</html>
*/
