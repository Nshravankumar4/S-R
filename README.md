# TransBill | Transport Invoice Studio

TransBill is an automated invoice generation system for transport freight billing. It populates an approved Word template (`templates/11048.docx`) directly from form inputs and generates finished `.docx` invoices ready for download, printing, or sending.

The operator **never** has to open Microsoft Word to edit or format invoices manually.

---

## Quick Start

1. Start the server:
   ```powershell
   py server.py
   ```
2. Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
3. Fill out the web form (the live invoice preview updates in real time as you type).
4. Click **Generate invoice DOCX**.
5. The backend automatically calculates totals, populates the Word template, saves the new file to `generated/Invoice-{invoiceNumber}.docx`, and initiates the download directly to your computer.

---

## Key Features

- **Zero Manual Word Editing**: Form inputs are placed into the exact locations and runs of the master template while strictly preserving font styles, table borders, cell dimensions, and alignment.
- **Server-Side Calculations**: Computes freight (`weight × rate`), tax modes (IGST / CGST+SGST / none), other charges, discounts, grand totals, and Indian currency words ("Rupees ... Only").
- **Live Visual Preview**: The right-hand sheet mirrors the template layout and updates continuously as the operator types.
- **Duplicate Prevention**: Prevents accidental overwriting of existing invoices with friendly warning messages.
- **Draft History**: Recent drafts are saved locally in the browser for instant recall.
- **Pristine Reference Preservation**: The original `11048.docx` is preserved intact as the reference baseline.