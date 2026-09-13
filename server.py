import json
import os
import re
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATE_PATH = ROOT / "templates" / "11048.docx"
FALLBACK_TEMPLATE_PATH = ROOT / "11048.docx"
OUTPUT_DIR = ROOT / "generated"
DATA_DIR = ROOT / "data"

OUTPUT_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)


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
        return "Zero Rupees Only"

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


def get_val(data, *keys, fallback="-"):
    if not isinstance(data, dict):
        return fallback
    for k in keys:
        if k in data and str(data[k]).strip():
            return str(data[k]).strip()
    return fallback


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


def escape_xml(text_val):
    return (
        str(text_val or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def create_invoice_docx(data, output_path):
    template = TEMPLATE_PATH if TEMPLATE_PATH.exists() else FALLBACK_TEMPLATE_PATH
    if not template.exists():
        raise FileNotFoundError("Invoice template not found at templates/11048.docx")

    with zipfile.ZipFile(template) as z:
        files = {name: z.read(name) for name in z.namelist()}

    xml = files["word/document.xml"].decode("utf-8")
    rows = re.findall(r"<w:tr\b[^>]*>.*?</w:tr>", xml, flags=re.DOTALL)
    row9 = rows[9]
    row10 = rows[10]

    raw_lrs = data.get("lrs")
    if not raw_lrs or not isinstance(raw_lrs, list):
        raw_lrs = [{
            "sl_no": "1",
            "lrNumber": get_val(data, "lrNumber"),
            "lrDate": get_val(data, "lrDate", get_val(data, "invoiceDate")),
            "loadingLocation": get_val(data, "loadingLocation"),
            "unloadingLocation": get_val(data, "unloadingLocation"),
            "goodsDescription": get_val(data, "goodsDescription"),
            "vehicleNumber": get_val(data, "vehicleNumber"),
            "packages": get_val(data, "packages", "-"),
            "weight": float(data.get("weight") or 0),
            "rate": float(data.get("rate") or 0),
            "otherCharges": float(data.get("otherCharges") or 0),
        }]

    total_freight = 0.0
    total_others = 0.0
    generated_rows = []

    for idx, lr in enumerate(raw_lrs, start=1):
        weight = float(lr.get("weight") or 0)
        rate = float(lr.get("rate") or 0)
        freight = weight * rate
        other_charges = float(lr.get("otherCharges") or lr.get("other_charges") or 0)
        total_freight += freight
        total_others += other_charges
        line_total = freight + other_charges

        r_xml = row9
        r_xml = r_xml.replace("{{sl_no}}", str(idx))
        r_xml = r_xml.replace("{{lr_number}}", escape_xml(get_val(lr, "lrNumber", "lr_number")))
        r_xml = r_xml.replace("{{lr_date}}", escape_xml(format_date(get_val(lr, "lrDate", "lr_date"))))
        r_xml = r_xml.replace("{{loading_location}}", escape_xml(get_val(lr, "loadingLocation", "loading_location", fallback=get_val(data, "loadingLocation"))))
        r_xml = r_xml.replace("{{unloading_location}}", escape_xml(get_val(lr, "unloadingLocation", "unloading_location", fallback=get_val(data, "unloadingLocation"))))
        r_xml = r_xml.replace("{{goods_description}}", escape_xml(get_val(lr, "goodsDescription", "goods_description", fallback=get_val(data, "goodsDescription"))))
        r_xml = r_xml.replace("{{vehicle_number}}", escape_xml(get_val(lr, "vehicleNumber", "vehicle_number", fallback=get_val(data, "vehicleNumber"))))
        r_xml = r_xml.replace("{{packages}}", escape_xml(get_val(lr, "packages", fallback="-")))
        r_xml = r_xml.replace("{{weight}}", f"{weight:.3f}" if weight > 0 else "-")
        r_xml = r_xml.replace("{{rate}}", f"{rate:g}" if rate > 0 else "-")
        r_xml = r_xml.replace("{{freight}}", f"{freight:,.0f}" if freight.is_integer() else f"{freight:,.2f}")
        r_xml = r_xml.replace("{{other_charges}}", f"{other_charges:g}" if other_charges > 0 else "0")
        r_xml = r_xml.replace("{{total}}", f"{line_total:,.0f}" if line_total.is_integer() else f"{line_total:,.2f}")
        generated_rows.append(r_xml)

    # Pad with empty rows up to 4 if fewer than 4
    for _ in range(len(generated_rows), 4):
        generated_rows.append(row10)

    block_4 = rows[9] + rows[10] + rows[11] + rows[12]
    xml = xml.replace(block_4, "".join(generated_rows), 1)

    discount = float(data.get("discount") or 0)
    overall_others = float(data.get("otherCharges") or 0)
    taxable_amount = total_freight + (total_others if total_others > 0 else overall_others) - discount

    tax_mode = data.get("taxMode", "none")
    tax_rate = float(data.get("taxRate") or 0)
    tax = 0.0
    if tax_mode in ("igst", "split"):
        tax = taxable_amount * (tax_rate / 100.0)

    grand_total = round(taxable_amount + tax)
    addr_1, addr_2 = split_address(data.get("customerAddress"))
    invoice_date = format_date(get_val(data, "invoiceDate"))

    mapping = {
        "{{invoice_number}}": get_val(data, "invoiceNumber"),
        "{{invoice_date}}": invoice_date,
        "{{customer_name}}": get_val(data, "customerName"),
        "{{customer_address_1}}": addr_1,
        "{{customer_address_2}}": addr_2,
        "{{gstin}}": get_val(data, "customerGstin"),
        "{{customer_state}}": get_val(data, "customerState"),
        "{{customer_state_code}}": get_val(data, "customerStateCode"),
        "{{consignor}}": get_val(data, "consignor", fallback=get_val(data, "customerName")),
        "{{consignor_address}}": get_val(data, "consignorAddress", fallback=addr_1),
        "{{consignor_gstin}}": get_val(data, "consignorGstin", fallback=get_val(data, "customerGstin")),
        "{{consignor_state_code}}": get_val(data, "consignorStateCode", fallback=get_val(data, "customerStateCode")),
        "{{consignee}}": get_val(data, "consignee", fallback=get_val(data, "customerName")),
        "{{consignee_address}}": get_val(data, "consigneeAddress", fallback=addr_1),
        "{{consignee_state_code}}": get_val(data, "consigneeStateCode", fallback=get_val(data, "customerStateCode")),
        "{{remarks}}": get_val(data, "remarks", fallback="NA"),
        "{{grand_total}}": f"{grand_total:,.0f}",
        "{{amount_in_words}}": money_words(grand_total),
    }

    for k, v in mapping.items():
        xml = xml.replace(k, escape_xml(v))

    files["word/document.xml"] = xml.encode("utf-8")
    stamp_sign_file = ROOT / "stamp_with_sign.png"
    if stamp_sign_file.exists():
        stamp_bytes = stamp_sign_file.read_bytes()
        files["word/media/image3.png"] = stamp_bytes
        files["word/media/image4.png"] = stamp_bytes

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as z_out:
        for name, content in files.items():
            z_out.writestr(name, content)

    return {
        "grandTotal": f"{grand_total:,.0f}",
        "amountInWords": money_words(grand_total),
        "totalFreight": f"{total_freight:,.0f}",
    }


def convert_docx_to_pdf(docx_path, pdf_path):
    try:
        import win32com.client
        import pythoncom
        pythoncom.CoInitialize()
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        try:
            doc = word.Documents.Open(str(docx_path.resolve()), ReadOnly=True)
            doc.SaveAs(str(pdf_path.resolve()), FileFormat=17) # 17 = wdFormatPDF
            doc.Close()
            return True
        finally:
            word.Quit()
            pythoncom.CoUninitialize()
    except Exception as e:
        print(f"Warning: Word COM PDF conversion failed: {e}")
        return False


def get_all_saved_invoices():
    invoices = []
    seen = set()

    for p in DATA_DIR.glob("Invoice-*.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                num = str(data.get("invoiceNumber", "")).strip()
                if num:
                    seen.add(num)
                    docx_exists = (OUTPUT_DIR / f"Invoice-{safe_filename(num)}.docx").exists()
                    pdf_exists = (OUTPUT_DIR / f"Invoice-{safe_filename(num)}.pdf").exists()
                    invoices.append({
                        "invoiceNumber": num,
                        "invoiceDate": data.get("invoiceDate", ""),
                        "customerName": data.get("customerName", ""),
                        "lrCount": len(data.get("lrs", [])) if data.get("lrs") else 1,
                        "grandTotal": data.get("grandTotal") or data.get("total", ""),
                        "status": "Generated" if (docx_exists or pdf_exists) else "Saved",
                        "hasDocx": docx_exists,
                        "hasPdf": pdf_exists,
                        "filename": f"Invoice-{safe_filename(num)}.docx",
                        "pdfFilename": f"Invoice-{safe_filename(num)}.pdf",
                    })
        except Exception:
            pass

    for p in OUTPUT_DIR.glob("Invoice-*.docx"):
        m = re.match(r"Invoice-(.+)\.docx", p.name)
        if m:
            num = m.group(1)
            if num not in seen:
                seen.add(num)
                pdf_exists = (OUTPUT_DIR / f"Invoice-{safe_filename(num)}.pdf").exists()
                invoices.append({
                    "invoiceNumber": num,
                    "invoiceDate": "-",
                    "customerName": "-",
                    "lrCount": 1,
                    "grandTotal": "-",
                    "status": "Generated",
                    "hasDocx": True,
                    "hasPdf": pdf_exists,
                    "filename": p.name,
                    "pdfFilename": f"Invoice-{safe_filename(num)}.pdf" if pdf_exists else None,
                })

    def sort_key(item):
        val = item["invoiceNumber"]
        try:
            return int(re.sub(r"\D", "", val))
        except Exception:
            return 0

    return sorted(invoices, key=sort_key, reverse=True)


def calculate_next_invoice_number():
    invoices = get_all_saved_invoices()
    max_num = 11047
    for inv in invoices:
        num_str = inv["invoiceNumber"]
        match = re.search(r"(\d+)", num_str)
        if match:
            n = int(match.group(1))
            if n > max_num:
                max_num = n
    return str(max_num + 1)


class InvoiceHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pdf": "application/pdf",
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".png": "image/png",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path == "/api/invoices/next-number":
            next_num = calculate_next_invoice_number()
            resp = json.dumps({"ok": True, "nextInvoiceNumber": next_num}).encode("utf-8")
            self.send_json_response(200, resp)
            return

        if clean_path == "/api/invoices":
            invoices = get_all_saved_invoices()
            resp = json.dumps({"ok": True, "invoices": invoices}).encode("utf-8")
            self.send_json_response(200, resp)
            return

        if clean_path.startswith("/api/invoices/"):
            num = clean_path[len("/api/invoices/"):].strip()
            data_file = DATA_DIR / f"Invoice-{safe_filename(num)}.json"
            if data_file.exists():
                with open(data_file, "r", encoding="utf-8") as f:
                    content = f.read().encode("utf-8")
                self.send_json_response(200, content)
            else:
                self.send_json_response(404, json.dumps({"ok": False, "error": f"Invoice {num} not found"}).encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path != "/api/invoices":
            self.send_error(404, "Endpoint Not Found")
            return
        self.handle_save(is_edit=False)

    def do_PUT(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path.startswith("/api/invoices/"):
            num = clean_path[len("/api/invoices/"):].strip()
            self.handle_save(is_edit=True, target_number=num)
        else:
            self.send_error(404, "Endpoint Not Found")

    def handle_save(self, is_edit=False, target_number=None):
        try:
            body_length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(body_length).decode("utf-8"))

            invoice_number = target_number or get_val(data, "invoiceNumber", "").strip()
            if not invoice_number:
                invoice_number = calculate_next_invoice_number()
                data["invoiceNumber"] = invoice_number

            required_fields = [
                ("invoiceNumber", "Invoice Number"),
                ("invoiceDate", "Invoice Date"),
                ("customerName", "Customer Name"),
                ("customerGstin", "Customer GSTIN"),
                ("customerAddress", "Customer Address"),
            ]
            for key, label in required_fields:
                if not str(data.get(key, "")).strip():
                    raise ValueError(f"Please enter {label}.")

            lrs = data.get("lrs") or []
            if not lrs:
                raise ValueError("Please add at least one LR details row.")

            for i, lr in enumerate(lrs, 1):
                if not str(lr.get("lrNumber", "")).strip():
                    raise ValueError(f"Please enter LR Number for LR #{i}.")
                if not str(lr.get("lrDate", "")).strip():
                    raise ValueError(f"Please enter LR Date for LR #{i}.")
                if not str(lr.get("vehicleNumber", "")).strip():
                    raise ValueError(f"Please enter Vehicle Number for LR #{i}.")
                if not str(lr.get("weight", "")).strip() or float(lr.get("weight") or 0) <= 0:
                    raise ValueError(f"Please enter valid Weight for LR #{i}.")
                if not str(lr.get("rate", "")).strip() or float(lr.get("rate") or 0) <= 0:
                    raise ValueError(f"Please enter valid Rate for LR #{i}.")

            filename = f"Invoice-{safe_filename(invoice_number)}.docx"
            output_path = OUTPUT_DIR / filename

            if not is_edit and output_path.exists():
                raise ValueError(f"Invoice {invoice_number} already exists. Please use a new invoice number.")

            # 1. Create DOCX from master template
            meta = create_invoice_docx(data, output_path)
            data["grandTotal"] = meta["grandTotal"]
            data["amountInWords"] = meta["amountInWords"]
            data["totalFreight"] = meta["totalFreight"]

            # 2. Convert to PDF
            pdf_filename = f"Invoice-{safe_filename(invoice_number)}.pdf"
            pdf_path = OUTPUT_DIR / pdf_filename
            has_pdf = convert_docx_to_pdf(output_path, pdf_path)
            data["hasDocx"] = True
            data["hasPdf"] = has_pdf

            # 3. Save invoice JSON
            json_path = DATA_DIR / f"Invoice-{safe_filename(invoice_number)}.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            response = json.dumps({
                "ok": True,
                "invoiceNumber": invoice_number,
                "filename": filename,
                "url": f"/generated/{filename}",
                "pdfFilename": pdf_filename if has_pdf else None,
                "pdfUrl": f"/generated/{pdf_filename}" if has_pdf else None,
                "message": f"Invoice {invoice_number} {'updated' if is_edit else 'generated'} successfully."
            }).encode("utf-8")

            self.send_json_response(200, response)

        except Exception as error:
            response = json.dumps({
                "ok": False,
                "error": str(error)
            }).encode("utf-8")
            self.send_json_response(400, response)

    def send_json_response(self, code, content):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(content)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        if self.path.endswith(".docx") or self.path.endswith(".pdf"):
            filename = Path(self.path).name
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"
    server = ThreadingHTTPServer((host, port), InvoiceHandler)
    print("=" * 60)
    print(f"TransBill System running at http://{host}:{port}")
    print(f"Master Template: {TEMPLATE_PATH}")
    print(f"Generated Invoices Directory: {OUTPUT_DIR}")
    print(f"Data Directory: {DATA_DIR}")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()