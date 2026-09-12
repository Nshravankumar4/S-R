# Invoice Auto-Fill and DOCX Generation System — Final Requirements

## 1. Objective
Build a simple web application that allows an operator to create transport freight invoices without manually editing a Word document.

The system uses the approved invoice template:
```
templates/11048.docx
```
(derived from the master reference `11048.docx`).

The operator only enters the required invoice information into a web form. After clicking **Generate invoice DOCX**, the system automatically creates a new `.docx` invoice using the submitted values.

The operator does not manually open, edit, copy, paste, or save the Word template.

---

## 2. Required Workflow
```
Operator
   ↓
Open Web Application (http://127.0.0.1:8000)
   ↓
Fill Invoice Form
   ↓
Click "Generate invoice DOCX"
   ↓
Frontend sends form data to backend (POST /api/invoices)
   ↓
Backend validates the data
   ↓
Backend opens master template (templates/11048.docx)
   ↓
Backend calculates totals and auto-fills invoice fields
   ↓
Backend preserves original template formatting & layout
   ↓
Backend creates final Invoice-{number}.docx in generated/
   ↓
Browser automatically downloads finished DOCX
```

**Target experience:** Fill form → Generate Invoice → Get DOCX. Nothing else is required from the operator.

---

## 3. Master Template
- The master template `templates/11048.docx` is the visual source of truth.
- The original `11048.docx` is preserved and never modified by the server.
- The master template retains approved:
  - Company branding & emblem
  - Company name & contact details
  - GST details
  - Bank payment details
  - Table structure & border weights
  - Fonts, sizes, bolding, and cell alignments
  - Legal text & declarations
- Only the required variable fields are populated dynamically.

---

## 4. Invoice Form Fields
The web application provides a clean, responsive form capturing only variable trip and invoice information:
1. **Invoice Details**: Invoice Number, Invoice Date, LR Number, LR Date
2. **Billed Party**: Customer Name, GSTIN, Billing Address, State, State Code
3. **Shipment & Vehicle**: Consignor, Consignee, Loading Location, Unloading Location, Vehicle Number, Goods Description, Packages/Bags, Weight (kg)
4. **Charges**: Freight Rate, Other Charges, Discount, Tax Mode (None / IGST / CGST+SGST), Tax Rate (%), Remarks

---

## 5. Calculations
The backend server performs all financial calculations:
- `Freight = Weight × Rate`
- `Taxable Amount = Freight + Other Charges - Discount`
- `Tax = IGST or CGST + SGST` (based on tax mode and tax rate)
- `Grand Total = Round(Taxable Amount + Tax)`
- `Amount in Words = Indian currency words (e.g. Rupees Seven Thousand Only)`

---

## 6. Validation & Duplicate Prevention
- **Required fields**: Invoice Number, Invoice Date, Customer Name, Vehicle Number, Weight, Rate.
- If any required field is missing, generation stops with a clear message: `"Please enter {Field Name}."`
- Form values remain intact when validation fails.
- If the invoice number already exists: `"Invoice {number} already exists. Please use another invoice number."`

---

## 7. Output & Delivery
- Invoices are saved automatically to `generated/Invoice-{invoiceNumber}.docx`.
- File download starts automatically upon generation.
- A direct download button and confirmation badge are displayed in the web UI.
- Local drafts are preserved in the browser for quick reloading.