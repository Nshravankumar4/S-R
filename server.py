import json
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from docx import Document

ROOT = Path(__file__).resolve().parent
TEMPLATE_PATH = ROOT / "templates" / "11048.docx"
FALLBACK_TEMPLATE_PATH = ROOT / "11048.docx"
OUTPUT_DIR = ROOT / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)


def money_words(number):
    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def below_thousand(val):
        if val < 20:
            return ones[val]
        if val < 100:
            return f"{tens[val // 10]} {ones[val % 10]}".strip()
        return f"{ones[val // 100]} Hundred {below_thousand(val % 100)}".strip()

    value = int(float(number or 0))
    if value == 0:
        return "Zero Rupees"

    parts = []
    for divisor, label in ((10000000, "Crore"), (100000, "Lakh"), (1000, "Thousand")):
        amount = value // divisor
        if amount:
            parts.append(f"{below_thousand(amount)} {label}")
            value %= divisor
    if value:
        parts.append(below_thousand(value))
    return f"Rupees {' '.join(parts)} Only".replace("  ", " ")


def safe_filename(invoice_number):
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", str(invoice_number or "invoice")).strip("-")
    return cleaned or "invoice"


def get_val(data, key, fallback="-"):
    current = str(data.get(key, "")).strip()
    return current if current else fallback


def format_date(value_text):
    raw = str(value_text or "").strip()
    if len(raw) == 10 and raw[4] == "-":
        year, month, day = raw.split("-")
        return f"{day}-{month}-{year}"
    return raw or "-"


def split_address(addr_text):
    raw = str(addr_text or "").strip()
    if not raw:
        return "-", "-"
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if len(lines) >= 2:
        return lines[0], ", ".join(lines[1:])
    if len(raw) > 40 and "," in raw:
        idx = raw.find(",", 25)
        if idx != -1:
            return raw[:idx].strip(), raw[idx + 1:].strip()
    return raw, "-"


def replace_placeholders(doc, mapping):
    def replace_in_paragraph(p):
        for key, val in mapping.items():
            if key in p.text:
                replaced = False
                for run in p.runs:
                    if key in run.text:
                        run.text = run.text.replace(key, str(val))
                        replaced = True
                if not replaced and key in p.text:
                    full_text = "".join(run.text for run in p.runs)
                    if key in full_text:
                        full_text = full_text.replace(key, str(val))
                        if p.runs:
                            p.runs[0].text = full_text
                            for run in p.runs[1:]:
                                run.text = ""

    for p in doc.paragraphs:
        replace_in_paragraph(p)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_in_paragraph(p)


def create_invoice_docx(data, output_path):
    template = TEMPLATE_PATH if TEMPLATE_PATH.exists() else FALLBACK_TEMPLATE_PATH
    if not template.exists():
        raise FileNotFoundError("Invoice template not found. Please ensure templates/11048.docx exists.")

    doc = Document(template)

    weight = float(data.get("weight") or 0)
    rate = float(data.get("rate") or 0)
    freight = weight * rate
    other_charges = float(data.get("otherCharges") or 0)
    discount = float(data.get("discount") or 0)

    taxable_amount = freight + other_charges - discount
    tax_mode = data.get("taxMode", "none")
    tax_rate = float(data.get("taxRate") or 0)

    cgst = sgst = igst = 0.0
    if tax_mode == "igst":
        igst = taxable_amount * (tax_rate / 100.0)
    elif tax_mode == "split":
        cgst = taxable_amount * ((tax_rate / 2.0) / 100.0)
        sgst = cgst

    grand_total = taxable_amount + cgst + sgst + igst
    grand_total_rounded = round(grand_total)

    addr_1, addr_2 = split_address(data.get("customerAddress"))
    invoice_date = format_date(get_val(data, "invoiceDate"))
    lr_date = format_date(get_val(data, "lrDate", invoice_date))

    mapping = {
        "{{invoice_number}}": get_val(data, "invoiceNumber"),
        "{{invoice_date}}": invoice_date,
        "{{customer_name}}": get_val(data, "customerName"),
        "{{customer_address_1}}": addr_1,
        "{{customer_address_2}}": addr_2,
        "{{gstin}}": get_val(data, "customerGstin"),
        "{{customer_state}}": get_val(data, "customerState"),
        "{{customer_state_code}}": get_val(data, "customerStateCode"),
        "{{consignor}}": get_val(data, "consignor", get_val(data, "customerName")),
        "{{consignor_address}}": get_val(data, "consignorAddress", addr_1),
        "{{consignor_gstin}}": get_val(data, "consignorGstin", get_val(data, "customerGstin")),
        "{{consignor_state_code}}": get_val(data, "consignorStateCode", get_val(data, "customerStateCode")),
        "{{consignee}}": get_val(data, "consignee", get_val(data, "customerName")),
        "{{consignee_address}}": get_val(data, "consigneeAddress", addr_1),
        "{{consignee_state_code}}": get_val(data, "consigneeStateCode", get_val(data, "customerStateCode")),
        "{{sl_no}}": "1",
        "{{lr_number}}": get_val(data, "lrNumber"),
        "{{lr_date}}": lr_date,
        "{{loading_location}}": get_val(data, "loadingLocation"),
        "{{unloading_location}}": get_val(data, "unloadingLocation"),
        "{{goods_description}}": get_val(data, "goodsDescription"),
        "{{vehicle_number}}": get_val(data, "vehicleNumber"),
        "{{packages}}": get_val(data, "packages", "-"),
        "{{weight}}": f"{weight:.3f}",
        "{{rate}}": f"{rate:g}",
        "{{freight}}": f"{freight:,.0f}" if freight.is_integer() else f"{freight:,.2f}",
        "{{other_charges}}": f"{other_charges:g}",
        "{{total}}": f"{(freight + other_charges):,.0f}" if (freight + other_charges).is_integer() else f"{(freight + other_charges):,.2f}",
        "{{remarks}}": get_val(data, "remarks", "NA"),
        "{{grand_total}}": f"{grand_total_rounded:,.0f}",
        "{{amount_in_words}}": money_words(grand_total_rounded),
    }

    replace_placeholders(doc, mapping)
    doc.save(output_path)


class InvoiceHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
    }

    def do_POST(self):
        if self.path != "/api/invoices":
            self.send_error(404, "Endpoint Not Found")
            return

        try:
            body_length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(body_length).decode("utf-8"))

            required_fields = [
                ("invoiceNumber", "Invoice Number"),
                ("invoiceDate", "Invoice Date"),
                ("customerName", "Customer Name"),
                ("vehicleNumber", "Vehicle Number"),
                ("weight", "Weight"),
                ("rate", "Rate"),
            ]
            missing = [label for key, label in required_fields if not str(data.get(key, "")).strip()]
            if missing:
                raise ValueError(f"Please enter {missing[0]}.")

            invoice_number = get_val(data, "invoiceNumber", "invoice")
            filename = f"Invoice-{safe_filename(invoice_number)}.docx"
            output_path = OUTPUT_DIR / filename

            if output_path.exists():
                raise ValueError(f"Invoice {invoice_number} already exists. Please use another invoice number.")

            create_invoice_docx(data, output_path)

            response = json.dumps({
                "ok": True,
                "invoiceNumber": invoice_number,
                "filename": filename,
                "url": f"/generated/{filename}",
                "message": f"Invoice generated successfully."
            }).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response)

        except Exception as error:
            response = json.dumps({
                "ok": False,
                "error": str(error)
            }).encode("utf-8")

            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        if self.path.endswith(".docx"):
            filename = Path(self.path).name
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 8000), InvoiceHandler)
    print("=" * 60)
    print("TransBill DOCX Auto-Generation System running at http://127.0.0.1:8000")
    print(f"Master Template: {TEMPLATE_PATH}")
    print(f"Generated Invoices Directory: {OUTPUT_DIR}")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()