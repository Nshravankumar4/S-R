# Transport Billing and Invoice Generation System

## 1. Purpose

Build a secure web application for a transport business that replaces handwritten freight invoices with a digital form and automatically generated PDF invoices.

The generated invoice must reproduce the supplied reference invoice `11048.pdf` in the same:

- One-page layout
- Page size and orientation
- Company logo and branding
- Headings and wording
- Fonts, font sizes, weights, and alignment
- Borders, table lines, spacing, and field positions
- Number formats and date formats
- Footer, bank, tax, and declaration text

The PDF must be suitable for printing, emailing, downloading, and storing.

## 2. Important Visual-Matching Requirement

The reference PDF is the visual source of truth. The developer must not redesign the invoice or replace it with a generic invoice layout.

The preferred implementation is a fixed PDF template:

1. Prepare an approved blank version of the reference invoice with the permanent design elements already present.
2. Define a field map containing the exact coordinates, font, size, color, alignment, and maximum length for every variable value.
3. Validate the form data.
4. Write the submitted values into the mapped positions.
5. Render the completed invoice as a one-page PDF.
6. Compare the generated PDF with the approved reference/template before release.

If an editable blank template cannot be obtained, the developer must recreate the page using a fixed PDF drawing layer and obtain business approval before implementation is considered complete. Exact visual matching cannot be guaranteed from a screenshot alone; the original logo, fonts, and approved permanent text are required.

## 3. Users and Permissions

### 3.1 Administrator

- Sign in securely.
- Manage users and roles.
- Configure company profile, bank details, tax details, numbering rules, and default values.
- Manage customers, consignors, consignees, locations, vehicles, and rates.
- Upload or replace an approved invoice template.
- Preview and approve template field coordinates.
- View, download, print, cancel, and reissue invoices.
- Export invoice records.
- View audit history.

### 3.2 Billing Operator

- Create invoices from the billing form.
- Select saved customers and trip information.
- Review calculated charges.
- Preview the invoice before finalizing it.
- Generate, download, and print invoices.
- Search previously generated invoices.
- Save drafts where permitted.

### 3.3 Read-Only User

- Search and view authorized invoices.
- Download authorized invoice PDFs.
- Cannot edit, delete, or finalize invoices.

## 4. Invoice Form Requirements

The form must be divided into sections and must support keyboard entry, clear validation messages, Save Draft, Preview, Generate PDF, Reset, and Cancel actions.

### 4.1 Invoice Metadata

- Invoice number: generated automatically according to the configured numbering rule; administrator override requires permission and an audit record.
- Invoice date: required; default to the current business date; editable by authorized users.
- Transport document/LR number: required where applicable.
- Document type: freight invoice, tax invoice, debit note, credit note, or other configured type.
- Financial year: calculated from the invoice date if required by local accounting rules.
- Currency: default INR and configurable only by an administrator.

### 4.2 Billed Customer

- Customer/company name: required.
- Billing address: required.
- GSTIN: optional or required according to the customer's tax status.
- PAN: optional or required according to the customer's tax status.
- State and state code: required when tax calculation depends on the state.
- Contact person, phone number, and email: optional.
- Customer account/reference number: optional.

The operator must be able to select a saved customer or enter a new customer subject to permission. Saved customer data must be copied into the invoice at generation time so later customer edits do not change an old invoice.

### 4.3 Consignor and Consignee

For each party, capture:

- Name
- Address
- GSTIN, if applicable
- State and state code
- Contact details, if required

The operator must be able to select saved parties and locations.

### 4.4 Shipment and Trip Details

The system must support one or more shipment rows. Each row must allow:

- LR number
- Booking/loading date
- Loading location
- Unloading/delivery location
- Consignor
- Consignee
- Vehicle number
- Driver name or driver reference, if required
- Number and type of packages/bags
- Description of goods
- Actual weight
- Chargeable weight
- Weight unit
- Freight rate
- Rate unit
- Freight amount
- Other row-level charges or deductions
- Remarks

The row structure must preserve the same columns and order as the reference invoice. Any column that is not used must remain blank rather than causing the invoice layout to shift.

### 4.5 Charges

The charges section must support configurable line items, including as applicable:

- Freight
- Loading charges
- Unloading charges
- Detention or waiting charges
- Hamali/handling charges
- Toll charges
- Advance adjustment
- Other charges
- Discount or deduction
- Taxable value
- CGST
- SGST
- IGST
- Round-off
- Grand total

Tax lines must be shown only when enabled by the configured tax rules. The application must not silently invent a tax rate. Tax rates and whether the transaction is intra-state or inter-state must be configured or explicitly selected.

## 5. Calculation Rules

All monetary calculations must be performed by the server and recalculated whenever relevant inputs change.

Minimum rules:

- `Freight amount = chargeable weight x freight rate`, when the selected rate unit requires weight-based calculation.
- If the rate is per trip, per vehicle, per package, or another unit, the calculation must use the selected rate unit.
- `Taxable value = sum of applicable charge lines - deductions`.
- Tax must be calculated from the configured tax rate and taxable value.
- `Grand total = taxable value + taxes + non-taxable charges + round-off`.
- Round-off must be explicit and configurable, never hidden in another charge.
- Negative amounts must be blocked unless the selected document type permits them.
- The system must show the calculation breakdown before PDF generation.
- Every amount must use a consistent decimal precision and Indian number formatting where required.
- The total must be converted into words using the configured currency wording, for example, “Rupees Seven Thousand Only”.

The server must recalculate all totals during final generation to prevent client-side manipulation.

## 6. Static Company Information

Permanent company information must come from the company profile/template configuration instead of being typed by operators. This may include:

- Legal company name
- Registered address
- Logo
- Phone, email, and website
- GSTIN
- PAN
- SAC code, such as `996511`, if approved for this business
- Bank name
- Bank account number
- IFSC code
- Branch
- Payment terms
- Declaration and authorized-signatory text

The exact values, spelling, capitalization, and punctuation must be copied from the approved reference invoice and verified by the business owner. Sensitive bank details must be protected and visible only to authorized users.

## 7. PDF Generation

The Generate PDF operation must:

- Generate exactly one page unless an administrator explicitly enables multi-page invoices.
- Use the approved page size, margins, and orientation.
- Preserve all fixed text and design elements from the approved template.
- Place variable values at fixed coordinates.
- Prevent text from overlapping borders or other fields.
- Apply wrapping, truncation, or a controlled smaller font according to each field's approved rule.
- Keep table row heights stable.
- Embed or reliably load the approved fonts.
- Embed the logo at the approved resolution.
- Include a unique invoice identifier and generation timestamp in system metadata, without adding unapproved visible text to the invoice.
- Produce a non-editable or access-controlled PDF according to business policy.
- Download with a predictable filename such as `Invoice-{invoice-number}.pdf`.

The PDF must be generated from the saved invoice record, not directly from unsaved browser values.

## 8. Preview and Approval Workflow

1. Operator opens the invoice form.
2. Operator selects or enters customer, shipment, and charge details.
3. System validates required fields and shows calculations.
4. Operator selects Preview.
5. System displays the actual generated PDF, not an approximate HTML preview.
6. Operator reviews all values and confirms Generate/Finalize.
7. System assigns or confirms the invoice number, saves an immutable finalized record, generates the PDF, and records the event in the audit log.
8. Finalized invoices cannot be silently edited. Corrections must create a cancellation, revision, credit note, or replacement according to configured accounting policy.

## 9. Data Storage

Store, at minimum:

- Users, roles, and login history
- Company profile and template versions
- Customers
- Consignors and consignees
- Locations
- Vehicles and drivers
- Rates and tax rules
- Draft invoices
- Finalized invoice data
- Generated PDF file or secure PDF storage reference
- Invoice status and cancellation reason
- Audit events

Each finalized invoice must preserve the exact data used to create its PDF, including the template version and calculation settings.

Recommended invoice statuses:

- Draft
- Previewed
- Finalized
- Downloaded
- Sent
- Cancelled
- Replaced

## 10. Search, Reports, and Exports

Authorized users must be able to search by:

- Invoice number
- Invoice date range
- Customer
- LR number
- Vehicle number
- GSTIN
- Invoice status

Provide totals and export to CSV or Excel for a selected date range, subject to permissions. Exported data must match the finalized invoice records.

## 11. Validation and Error Handling

The system must:

- Mark required fields clearly.
- Validate date, number, GSTIN, PAN, email, phone, vehicle number, and account formats where applicable.
- Prevent duplicate invoice numbers.
- Prevent finalization when required data or calculation inputs are missing.
- Show a useful error beside the invalid field.
- Preserve entered data after a validation error.
- Handle long names and addresses without breaking the fixed PDF layout.
- Log PDF generation failures and allow a permitted user to retry safely.
- Prevent duplicate invoices when a user double-clicks Generate.

## 12. Security and Reliability

- Use authenticated HTTPS access in production.
- Store passwords using a secure password hashing mechanism.
- Enforce role-based authorization on every server operation.
- Validate and sanitize all input on the server.
- Protect invoice PDFs from unauthorized access through authenticated, expiring download links where applicable.
- Keep an audit trail for creation, modification of drafts, finalization, cancellation, download, and template changes.
- Back up invoice data and generated PDFs.
- Use a database transaction when finalizing an invoice and assigning its number.
- Never expose credentials or full bank details in application logs.

## 13. Template Configuration and 100% Match Acceptance Test

The developer must create a template mapping sheet with one entry for every variable field:

| Field | PDF page | X | Y | Width | Height | Font | Size | Alignment | Overflow rule |
|---|---:|---:|---:|---:|---:|---|---:|---|---|
| Example: Invoice number | 1 | approved | approved | approved | approved | approved | approved | approved | approved |

The business owner must approve:

- Blank template
- Permanent text transcription
- Logo and fonts
- Field coordinates
- Sample invoice values
- Calculation results
- Final PDF appearance

Acceptance requires at least these test cases:

1. Generate an invoice using the same values as the reference PDF.
2. Confirm the generated PDF has the same page count, page size, orientation, text, logo, table lines, and field positions.
3. Confirm all totals and amount-in-words values are correct.
4. Test long customer names, addresses, and remarks.
5. Test multiple shipment rows.
6. Test zero, decimal, and invalid numeric values.
7. Test tax-enabled and tax-disabled invoices.
8. Test duplicate invoice number prevention.
9. Test cancellation and correction workflow.
10. Print the generated PDF and compare it with the approved printed reference.

The release is accepted only after the owner signs off the visual comparison and business calculations.

## 14. Recommended Technical Architecture

- Responsive web frontend for data entry and preview.
- Backend API for validation, calculations, authorization, numbering, and PDF generation.
- Relational database for invoice and master data.
- Secure file storage for generated PDFs and template versions.
- PDF generation library that supports fixed coordinates, embedded fonts, images, and deterministic output.
- Automated tests for calculations, validation, numbering, permissions, and PDF field placement.

The exact programming language and framework may be selected by the developer, but the PDF output and data rules in this document are mandatory.

## 15. Items Required From the Business Before Development

Provide:

- Original editable invoice template, if available, not only a screenshot or scanned PDF.
- High-resolution logo.
- Approved font files or font names and licenses.
- Exact permanent invoice text.
- Company legal details, GSTIN, PAN, SAC code, and bank details.
- Approved list of invoice fields and their order.
- Tax rules and sample calculations.
- Invoice numbering and financial-year rules.
- Correction, cancellation, and credit-note policy.
- User list and access permissions.
- At least five approved sample invoices covering normal and exceptional cases.

## 16. Definition of Done

The system is complete when an authorized operator can fill the form once, preview the real invoice, finalize it, and download a professional one-page PDF that matches the approved reference style and content, with correct calculations, secure storage, searchable records, audit history, and no handwritten data entry required.