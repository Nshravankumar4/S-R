import json
import os
import re
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)


def money_words(number):
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def below_thousand(value):
        if value < 20:
            return ones[value]
        if value < 100:
            return f"{tens[value // 10]} {ones[value % 10]}".strip()
        return f"{ones[value // 100]} Hundred {below_thousand(value % 100)}".strip()

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
    return f"{' '.join(parts)} Rupees"


def safe_filename(invoice_number):
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", str(invoice_number or "invoice")).strip("-")
    return cleaned or "invoice"


def value(data, key, fallback="-"):
    current = str(data.get(key, "")).strip()
    return current or fallback


def draw_text(pdf, x, y, text, size=8, bold=False):
    pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    pdf.drawString(x, y, str(text))


def draw_center(pdf, x, y, width, text, size=7, bold=False):
    font = "Helvetica-Bold" if bold else "Helvetica"
    pdf.setFont(font, size)
    pdf.drawCentredString(x + width / 2, y, str(text))


def draw_wrapped(pdf, x, y, text, max_width, size=8, leading=10, bold=False, max_lines=3):
    font = "Helvetica-Bold" if bold else "Helvetica"
    pdf.setFont(font, size)
    words = str(text).replace("\n", " ").split()
    lines = []
    current_line = ""
    for word in words:
        candidate = f"{current_line} {word}".strip()
        if current_line and stringWidth(candidate, font, size) > max_width:
            lines.append(current_line)
            current_line = word
        else:
            current_line = candidate
    if current_line:
        lines.append(current_line)
    for index, line in enumerate(lines[:max_lines]):
        pdf.drawString(x, y - index * leading, line)


def draw_fitted_center(pdf, x, y, width, text, size=7, bold=False):
    font = "Helvetica-Bold" if bold else "Helvetica"
    fitted_size = size
    while fitted_size > 4.5 and stringWidth(str(text), font, fitted_size) > width - 4:
        fitted_size -= 0.25
    pdf.setFont(font, fitted_size)
    pdf.drawCentredString(x + width / 2, y, str(text))


def draw_cell_grid(pdf, x, y, widths, row_heights):
    total_width = sum(widths)
    total_height = sum(row_heights)
    pdf.setLineWidth(1.2)
    pdf.rect(x, y, total_width, total_height)
    current_x = x
    for width in widths[:-1]:
        current_x += width
        pdf.line(current_x, y, current_x, y + total_height)
    current_y = y
    for height in row_heights[:-1]:
        current_y += height
        pdf.line(x, current_y, x + total_width, current_y)


def create_invoice_pdf(data, output_path):
    invoice_number = value(data, "invoiceNumber", "11048")
    invoice_date = value(data, "invoiceDate", "2026-09-02")
    lr_date = value(data, "lrDate", invoice_date)
    weight = float(data.get("weight") or 0)
    rate = float(data.get("rate") or 0)
    other = float(data.get("otherCharges") or 0)
    total = weight * rate + other
    pdf = canvas.Canvas(str(output_path), pagesize=landscape(A4))
    pdf.setTitle(f"Invoice {invoice_number}")
    margin = 18
    left = margin
    width = PAGE_WIDTH - margin * 2
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(1.5)

    pdf.rect(left, 16, width, PAGE_HEIGHT - 32)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawRightString(PAGE_WIDTH - 30, PAGE_HEIGHT - 35, "FREIGHT INVOICE")
    pdf.rect(left + 2, PAGE_HEIGHT - 43, width - 4, 8)

    header_top = PAGE_HEIGHT - 51
    header_height = 70
    pdf.rect(left + 2, header_top - header_height, width - 4, header_height)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(left + 95, header_top - 27, "S&R TRANSPORT")
    draw_text(pdf, left + 95, header_top - 40, "Transport Contractors & Fleet Owner", 9, True)
    draw_text(pdf, left + 95, header_top - 52, "Plot No. 341, Sai Bhagavan Colony, Beeramguda, R.C. Puram, Hyderabad - 502032", 8)
    draw_text(pdf, left + 95, header_top - 64, "Ph: 9704527762 / 9010578128 / 9966818478", 8, True)
    pdf.setFont("Helvetica-BoldOblique", 17)
    pdf.drawString(left + 25, header_top - 39, "S&R")

    bill_y = header_top - header_height - 57
    pdf.rect(left + 2, bill_y, width - 4, 57)
    draw_text(pdf, left + 8, bill_y + 40, f"M/S. {value(data, 'customerName', 'GREEN AGREVOLUTION PRIVATE LTD')}", 9, True)
    address = value(data, "customerAddress", "B-103/104, Gomti Nagar, Vibhuti Khand Gomti Nagar, Lucknow - 226010, UTTAR PRADESH")
    draw_wrapped(pdf, left + 35, bill_y + 25, address, 365, 8, 10, max_lines=2)
    draw_text(pdf, left + 35, bill_y + 5, value(data, "customerState", "UTTAR PRADESH"), 8)
    draw_text(pdf, left + 440, bill_y + 40, f"GSTIN: {value(data, 'customerGstin', '09AAECG6456H1ZC')}", 8, True)
    draw_text(pdf, left + 440, bill_y + 24, f"STATE: {value(data, 'customerState', 'UTTAR PRADESH')}", 8, True)
    draw_text(pdf, left + 440, bill_y + 10, f"STATE CODE: {value(data, 'customerStateCode', '09/UP')}", 8, True)
    draw_text(pdf, PAGE_WIDTH - 165, bill_y + 40, f"INVOICE NO: {invoice_number}", 8, True)
    draw_text(pdf, PAGE_WIDTH - 165, bill_y + 20, f"DATE: {invoice_date}", 8, True)

    parties_y = bill_y - 70
    pdf.rect(left + 2, parties_y, width - 4, 70)
    pdf.line(PAGE_WIDTH / 2, parties_y, PAGE_WIDTH / 2, parties_y + 70)
    draw_text(pdf, left + 8, parties_y + 54, f"CONSIGNOR: {value(data, 'consignor', 'GREEN AGREVOLUTION PRIVATE LTD')}", 8, True)
    draw_text(pdf, left + 8, parties_y + 38, "ADDRESS: C/O GREEN AGREVOLUTION PVT LTD, Medchal", 8)
    draw_text(pdf, left + 8, parties_y + 24, "Medchal    TELANGANA", 8)
    draw_text(pdf, left + 8, parties_y + 8, "GSTIN: 36AAECG6456H1ZF    STATE CODE: 36/TS", 8, True)
    draw_text(pdf, PAGE_WIDTH / 2 + 8, parties_y + 54, f"CONSIGNEE: {value(data, 'consignee', 'GREEN AGREVOLUTION PVT LTD')}", 8, True)
    draw_text(pdf, PAGE_WIDTH / 2 + 8, parties_y + 38, "ADDRESS: C/O Green Agrevolution Pvt Ltd, Medchal", 8)
    draw_text(pdf, PAGE_WIDTH / 2 + 8, parties_y + 24, "Medchal    TELANGANA", 8)
    draw_text(pdf, PAGE_WIDTH / 2 + 8, parties_y + 8, "GSTIN:    STATE CODE: 36/TS", 8, True)

    columns = [34, 45, 57, 72, 72, 62, 71, 48, 56, 45, 57, 57, 65]
    table_x = left + 2
    table_y = parties_y - 79
    draw_cell_grid(pdf, table_x, table_y, columns, [24, 12, 25, 25, 25, 25])
    headings = ["SL NO", "LR NO", "LR DATE", "LOADING", "UN-LOADING", "DESCRIPTION", "VEHICLE NO", "BAGS", "WEIGHT", "RATE", "FREIGHT", "OTHERS", "TOTAL"]
    current_x = table_x
    for heading, column_width in zip(headings, columns):
        draw_fitted_center(pdf, current_x, table_y + 67, column_width, heading, 6.5, True)
        current_x += column_width
    row_values = ["1", value(data, "lrNumber", "11403"), lr_date, value(data, "loadingLocation", "Medchal"), value(data, "unloadingLocation", "Kalakal"), value(data, "goodsDescription", "Seeds"), value(data, "vehicleNumber", "AP 28 X 7948"), value(data, "packages", "273"), f"{weight:.3f}", f"{rate:g}", f"{weight * rate:,.0f}", f"{other:g}", f"{total:,.0f}"]
    current_x = table_x
    for row_value, column_width in zip(row_values, columns):
        draw_fitted_center(pdf, current_x, table_y + 47, column_width, row_value, 7, False)
        current_x += column_width

    note_y = table_y - 20
    pdf.setFillColor(colors.HexColor("#dddddd"))
    pdf.rect(table_x, note_y, sum(columns), 20, fill=1)
    pdf.setFillColor(colors.black)
    pdf.rect(table_x, note_y, sum(columns), 20)
    draw_text(pdf, table_x + 3, note_y + 6, "Note:", 7, True)
    draw_text(pdf, table_x + 55, note_y + 6, f"Others include: {value(data, 'remarks', 'NA')}", 7, True)
    draw_text(pdf, PAGE_WIDTH - 140, note_y + 6, "GRAND TOTAL", 7, True)
    draw_text(pdf, PAGE_WIDTH - 75, note_y + 6, f"Rs. {total:,.0f}", 8, True)
    draw_text(pdf, table_x + 3, note_y - 14, "Amount Charged(in words):", 8, True)
    draw_text(pdf, table_x + 155, note_y - 14, money_words(total), 10, True)

    footer_y = 50
    draw_text(pdf, table_x, footer_y + 55, "SR TRANSPORT", 7, True)
    draw_text(pdf, table_x, footer_y + 41, "Transport Contractors & Fleet Owner", 7, True)
    draw_text(pdf, table_x, footer_y + 27, "Formerly Saritha Transport", 7, True)
    draw_text(pdf, table_x, footer_y + 13, "Plot No. 341, Sai Bhagavan Colony", 7, True)
    draw_text(pdf, table_x, footer_y, "Beeramguda, R.C. Puram, Hyderabad - 502032", 7, True)
    pdf.rect(PAGE_WIDTH / 2 - 75, footer_y + 15, 150, 60)
    draw_center(pdf, PAGE_WIDTH / 2 - 75, footer_y + 64, 150, "PAYMENT DETAILS", 8, True)
    draw_text(pdf, PAGE_WIDTH / 2 - 68, footer_y + 48, "Bank: Kotak Mahindra Bank", 7)
    draw_text(pdf, PAGE_WIDTH / 2 - 68, footer_y + 35, "A/C NO: 1720252626", 7)
    draw_text(pdf, PAGE_WIDTH / 2 - 68, footer_y + 22, "IFSC CODE: KKBK0007489", 7)
    draw_text(pdf, PAGE_WIDTH / 2 - 68, footer_y + 9, "Branch: Chandanagar", 7)
    draw_text(pdf, PAGE_WIDTH - 225, footer_y + 63, "For S&R TRANSPORT", 8, True)
    draw_text(pdf, PAGE_WIDTH - 145, footer_y + 25, "Authorised Signatory", 8, True)
    draw_text(pdf, left + 5, 26, "(Interest @24%p.a will be charged on all outstanding bills)", 7)
    draw_text(pdf, left + 5, 17, "Note: GST to be paid by Service Recipient     (SUBJECT TO SANGAREDDY JURISDICTION)", 7, True)
    draw_text(pdf, PAGE_WIDTH - 160, 17, "*THIS IS COMPUTER GENERATED BILL", 7, True)
    pdf.save()


class InvoiceHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/invoices":
            self.send_error(404)
            return
        try:
            body_length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(body_length).decode("utf-8"))
            invoice_number = value(data, "invoiceNumber", "invoice")
            filename = f"Invoice-{safe_filename(invoice_number)}.pdf"
            output_path = OUTPUT_DIR / filename
            create_invoice_pdf(data, output_path)
            response = json.dumps({"ok": True, "filename": filename, "url": f"/generated/{filename}"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response)
        except Exception as error:
            response = json.dumps({"ok": False, "error": str(error)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 8000), InvoiceHandler)
    print("TransBill running at http://127.0.0.1:8000")
    print("Generated PDFs are saved in:", OUTPUT_DIR)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
