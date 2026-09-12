# TransBill

TransBill is a dependency-free local MVP for creating transport freight invoices from form inputs.

## Run it

For automatic server-side PDF saving, run:

```powershell
py server.py
```

Then open `http://127.0.0.1:8000` in your browser. Fill the form and select **Generate invoice PDF**. After confirmation, the server saves the file automatically in `generated/Invoice-{invoice-number}.pdf` and opens it.

The `index.html` file can also be opened directly as a fallback. In that mode the browser generates the PDF locally.

For the best PDF result:

1. Fill the form.
2. Review the live invoice preview.
3. Select **Generate & print PDF**.
4. In the browser print dialog, choose **Save as PDF**, paper size **A4**, portrait orientation, and enable background graphics.

Drafts are stored in the browser's local storage on this computer.

## Current MVP features

- Live invoice preview shaped around the supplied `11048.pdf` reference.
- Freight calculation from weight x rate.
- Other charges, discount, tax mode, tax rate, grand total, and amount in words.
- Customer, LR, consignor, consignee, route, vehicle, package, and goods fields.
- Local draft history with load functionality.
- Direct A4 PDF generation that opens the completed invoice in a PDF viewer.

## Production work still required

- Replace placeholder company information with the approved legal details.
- Confirm the exact permanent text, logo, fonts, bank details, GST rules, and PDF coordinates against the original invoice.
- Add authenticated server storage, users, audit history, invoice numbering, and cloud PDF storage.
- Replace the canvas PDF renderer with a server-side template stamping service if pixel-level matching is required across all browsers.