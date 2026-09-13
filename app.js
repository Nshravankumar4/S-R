/**
 * TransBill - Transport Invoice Generation & Management System
 * S&R TRANSPORT - Client-Side Studio
 * 100% Online & Mobile Compatible on GitHub Pages
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const form = document.getElementById('invoiceForm');
  const statusBox = document.getElementById('statusBox');
  const draftStatus = document.getElementById('draftStatus');
  const headerModeBadge = document.getElementById('headerModeBadge');
  const editorHeading = document.getElementById('editorHeading');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // Core Inputs
  const invoiceNumberInput = document.getElementById('invoiceNumber');
  const invoiceDateInput = document.getElementById('invoiceDate');

  const customerNameInput = document.getElementById('customerName');
  const customerGstinInput = document.getElementById('customerGstin');
  const customerAddressInput = document.getElementById('customerAddress');
  const customerStateInput = document.getElementById('customerState');
  const customerStateCodeInput = document.getElementById('customerStateCode');

  const consignorInput = document.getElementById('consignor');
  const consigneeInput = document.getElementById('consignee');
  const consignorAddressInput = document.getElementById('consignorAddress');
  const consigneeAddressInput = document.getElementById('consigneeAddress');
  const consignorGstinInput = document.getElementById('consignorGstin');
  const consignorStateCodeInput = document.getElementById('consignorStateCode');

  const lrNumberInput = document.getElementById('lrNumber');
  const lrDateInput = document.getElementById('lrDate');
  const loadingLocationInput = document.getElementById('loadingLocation');
  const unloadingLocationInput = document.getElementById('unloadingLocation');
  const vehicleNumberInput = document.getElementById('vehicleNumber');
  const goodsDescriptionInput = document.getElementById('goodsDescription');
  const packagesInput = document.getElementById('packages');
  const weightInput = document.getElementById('weight');

  const rateInput = document.getElementById('rate');
  const otherChargesInput = document.getElementById('otherCharges');
  const discountInput = document.getElementById('discount');
  const taxModeInput = document.getElementById('taxMode');
  const taxRateInput = document.getElementById('taxRate');
  const remarksInput = document.getElementById('remarks');

  // Strip Calculations
  const calcFreight = document.getElementById('calcFreight');
  const calcTaxable = document.getElementById('calcTaxable');
  const calcGrandTotal = document.getElementById('calcGrandTotal');

  // Action Buttons
  const printButton = document.getElementById('printButton');
  const downloadPdfButton = document.getElementById('downloadPdfButton');
  const downloadDocxButton = document.getElementById('downloadDocxButton');
  const printPdfButton = document.getElementById('printPdfButton');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const clearFormButton = document.getElementById('clearFormButton');
  const fillSampleButton = document.getElementById('fillSampleButton');
  const chipGreenAgro = document.getElementById('chipGreenAgro');
  const chipClear = document.getElementById('chipClear');

  // History Elements
  const historyTableBody = document.getElementById('historyTableBody');
  const historySearchInput = document.getElementById('historySearchInput');
  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Live Preview Elements
  const previewCustomerName = document.getElementById('previewCustomerName');
  const previewCustomerAddress = document.getElementById('previewCustomerAddress');
  const previewCustomerGstin = document.getElementById('previewCustomerGstin');
  const previewCustomerState = document.getElementById('previewCustomerState');
  const previewCustomerStateCode = document.getElementById('previewCustomerStateCode');

  const previewInvoiceNumber = document.getElementById('previewInvoiceNumber');
  const previewInvoiceDate = document.getElementById('previewInvoiceDate');

  const previewConsignor = document.getElementById('previewConsignor');
  const previewConsignorAddress = document.getElementById('previewConsignorAddress');
  const previewConsignorGstin = document.getElementById('previewConsignorGstin');
  const previewConsignorStateCode = document.getElementById('previewConsignorStateCode');

  const previewConsignee = document.getElementById('previewConsignee');
  const previewConsigneeAddress = document.getElementById('previewConsigneeAddress');
  const previewConsigneeStateCode = document.getElementById('previewConsigneeStateCode');

  const previewLrNumber = document.getElementById('previewLrNumber');
  const previewLrDate = document.getElementById('previewLrDate');
  const previewLoading = document.getElementById('previewLoading');
  const previewUnloading = document.getElementById('previewUnloading');
  const previewDescription = document.getElementById('previewDescription');
  const previewVehicle = document.getElementById('previewVehicle');
  const previewPackages = document.getElementById('previewPackages');
  const previewWeight = document.getElementById('previewWeight');
  const previewRate = document.getElementById('previewRate');
  const previewFreight = document.getElementById('previewFreight');
  const previewOtherCharges = document.getElementById('previewOtherCharges');
  const previewTotal = document.getElementById('previewTotal');

  const previewRemarks = document.getElementById('previewRemarks');
  const previewGrandTotal = document.getElementById('previewGrandTotal');
  const previewWords = document.getElementById('previewWords');

  // Constants
  const STORAGE_KEY = 'transbill_invoices_v3';
  const BASELINE_INVOICE_NUM = 11048;

  // App State
  const state = {
    mode: 'new', // 'new' | 'edit'
    editingInvoiceNumber: null,
    invoices: [],
  };

  // --- Value Helpers ---
  const val = (el) => (el?.value || '').trim();
  const setVal = (el, v) => {
    if (el) el.value = v !== undefined && v !== null ? v : '';
  };
  const setText = (el, content) => {
    if (el) el.textContent = content;
  };

  const formatCurrency = (num) => {
    const n = Number(num) || 0;
    return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(2);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    if (/^\d{2}-\d{2}-\d{4}$/.test(isoStr)) return isoStr;
    const parts = isoStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoStr;
  };

  const parseDateToIso = (dStr) => {
    if (!dStr) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const escapeXml = (unsafe) => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const splitAddress = (address) => {
    if (!address) return ['-', '-'];
    const cleaned = address.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return ['-', '-'];
    if (lines.length === 1) {
      const parts = lines[0].split(',');
      if (parts.length > 2) {
        const mid = Math.ceil(parts.length / 2);
        return [parts.slice(0, mid).join(',').trim(), parts.slice(mid).join(',').trim()];
      }
      return [lines[0], '-'];
    }
    const mid = Math.ceil(lines.length / 2);
    return [lines.slice(0, mid).join(', '), lines.slice(mid).join(', ')];
  };

  // --- Number to Words Converter (Indian System) ---
  const numberToWords = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (num <= 0) return 'Rupees Zero Only';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertThreeDigits = (n) => {
      let str = '';
      if (n >= 100) {
        str += units[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += units[n] + ' ';
      }
      return str.trim();
    };

    let remaining = num;
    let parts = [];

    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');

    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');

    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;
    if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');

    const hundred = remaining;
    if (hundred > 0) parts.push(convertThreeDigits(hundred));

    const words = parts.join(' ').replace(/\s+/g, ' ').trim();
    return `Rupees ${words} Only`;
  };

  // --- Status Banner Helper ---
  const showStatus = (type, message, docxUrl = null, docxName = null, pdfUrl = null, pdfName = null) => {
    if (!statusBox) return;
    statusBox.style.display = 'block';
    statusBox.className = `status-box status-${type}`;

    let html = `<p style="margin:0 0 4px 0;">${message}</p>`;
    if (docxUrl || pdfUrl) {
      html += '<div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">';
      if (pdfUrl) {
        html += `<a href="${pdfUrl}" download="${pdfName || 'Invoice.pdf'}" class="status-download-btn pdf-btn" style="color:#fff;background:#15803d;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">📑 Download PDF</a>`;
      }
      if (docxUrl) {
        html += `<a href="${docxUrl}" download="${docxName || 'Invoice.docx'}" class="status-download-btn docx-btn" style="color:#fff;background:#0369a1;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">📄 Download Word (.docx)</a>`;
      }
      html += '</div>';
    }
    statusBox.innerHTML = html;

    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (statusBox.className.includes(`status-${type}`)) {
          statusBox.style.display = 'none';
        }
      }, 10000);
    }
  };

  // --- Calculations & Live Preview ---
  const calculateTotals = () => {
    const weight = parseFloat(val(weightInput)) || 0;
    const rate = parseFloat(val(rateInput)) || 0;
    const freight = weight * rate;

    const otherCharges = parseFloat(val(otherChargesInput)) || 0;
    const discount = parseFloat(val(discountInput)) || 0;
    const taxable = Math.max(0, freight + otherCharges - discount);

    const taxMode = val(taxModeInput) || 'none';
    const taxRate = parseFloat(val(taxRateInput)) || 0;
    let taxAmount = 0;

    if (taxMode !== 'none' && taxRate > 0) {
      taxAmount = (taxable * taxRate) / 100;
    }

    const grandTotal = Math.round(taxable + taxAmount);
    const words = numberToWords(grandTotal);

    return {
      weight,
      rate,
      freight,
      otherCharges,
      discount,
      taxable,
      taxMode,
      taxRate,
      taxAmount,
      grandTotal,
      words,
    };
  };

  const updatePreview = () => {
    const calc = calculateTotals();

    // Live Calculation Strip
    setText(calcFreight, `INR ${calc.freight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setText(calcTaxable, `INR ${calc.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setText(calcGrandTotal, `INR ${calc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    // Customer & Header
    const customer = val(customerNameInput) || 'GREEN AGREVOLUTION PRIVATE LTD';
    const gstin = val(customerGstinInput) || '09AAECG6456H1ZC';
    const addr = val(customerAddressInput) || 'B-103/104, Gomti Nagar, Vibhuti Khand Gomti Nagar,\nLucknow - 226010\nUTTAR PRADESH';
    const stateVal = val(customerStateInput) || 'UTTAR PRADESH';
    const stateCodeVal = val(customerStateCodeInput) || '09/UP';

    const invNum = val(invoiceNumberInput) || '11048';
    const invDate = formatDate(val(invoiceDateInput) || new Date().toISOString().slice(0, 10));

    setText(previewCustomerName, customer);
    setText(previewCustomerGstin, gstin);
    if (previewCustomerAddress) previewCustomerAddress.innerHTML = addr.replace(/\n/g, '<br>');
    setText(previewCustomerState, stateVal);
    setText(previewCustomerStateCode, stateCodeVal);

    setText(previewInvoiceNumber, invNum);
    setText(previewInvoiceDate, invDate);

    // Parties
    const consignor = val(consignorInput) || customer;
    const consignorAddr = val(consignorAddressInput) || addr;
    const consignorGstin = val(consignorGstinInput) || (gstin ? `36${gstin.slice(2)}` : '36AAECG6456H1ZF');
    const consignorStateCode = val(consignorStateCodeInput) || '36/TS';

    const consignee = val(consigneeInput) || customer;
    const consigneeAddr = val(consigneeAddressInput) || addr;
    const consigneeStateCode = consignorStateCode;

    setText(previewConsignor, consignor);
    if (previewConsignorAddress) previewConsignorAddress.innerHTML = consignorAddr.replace(/\n/g, '<br>');
    setText(previewConsignorGstin, consignorGstin);
    setText(previewConsignorStateCode, consignorStateCode);

    setText(previewConsignee, consignee);
    if (previewConsigneeAddress) previewConsigneeAddress.innerHTML = consigneeAddr.replace(/\n/g, '<br>');
    setText(previewConsigneeStateCode, consigneeStateCode);

    // Trip & Table Row 1
    setText(previewLrNumber, val(lrNumberInput) || '11403');
    setText(previewLrDate, formatDate(val(lrDateInput) || val(invoiceDateInput) || new Date().toISOString().slice(0, 10)));
    setText(previewLoading, val(loadingLocationInput) || 'Medchal');
    setText(previewUnloading, val(unloadingLocationInput) || 'Kalakal');
    setText(previewDescription, val(goodsDescriptionInput) || 'Seeds');
    setText(previewVehicle, val(vehicleNumberInput) || 'AP 28 X 7948');
    setText(previewPackages, val(packagesInput) || '273');
    setText(previewWeight, calc.weight > 0 ? calc.weight.toFixed(3) : '10.000');
    setText(previewRate, calc.rate > 0 ? String(calc.rate) : '700');
    setText(previewFreight, formatCurrency(calc.freight));
    setText(previewOtherCharges, calc.otherCharges > 0 ? String(calc.otherCharges) : '0');
    setText(previewTotal, formatCurrency(calc.freight + calc.otherCharges));

    // Footer & Notes
    setText(previewRemarks, val(remarksInput) || 'NA');
    setText(previewGrandTotal, `₹ ${formatCurrency(calc.grandTotal)}`);
    setText(previewWords, calc.words);
  };

  // --- Serialize Invoice Data ---
  const serializeInvoiceData = () => {
    const calc = calculateTotals();
    const invNum = val(invoiceNumberInput) || String(BASELINE_INVOICE_NUM);
    const invDate = val(invoiceDateInput) || new Date().toISOString().slice(0, 10);
    const lrNum = val(lrNumberInput) || '11403';
    const lrDate = val(lrDateInput) || invDate;

    const custName = val(customerNameInput);
    const custAddr = val(customerAddressInput);
    const custGstin = val(customerGstinInput);
    const custState = val(customerStateInput);
    const custStateCode = val(customerStateCodeInput);

    return {
      invoiceNumber: invNum,
      invoiceDate: invDate,
      customerName: custName,
      customerGstin: custGstin,
      customerAddress: custAddr,
      customerState: custState,
      customerStateCode: custStateCode,

      consignor: val(consignorInput) || custName,
      consignorAddress: val(consignorAddressInput) || custAddr,
      consignorGstin: val(consignorGstinInput) || custGstin,
      consignorStateCode: val(consignorStateCodeInput) || custStateCode,

      consignee: val(consigneeInput) || custName,
      consigneeAddress: val(consigneeAddressInput) || custAddr,
      consigneeStateCode: val(consignorStateCodeInput) || custStateCode,

      lrNumber: lrNum,
      lrDate: lrDate,
      loadingLocation: val(loadingLocationInput),
      unloadingLocation: val(unloadingLocationInput),
      vehicleNumber: val(vehicleNumberInput),
      goodsDescription: val(goodsDescriptionInput),
      packages: val(packagesInput),
      weight: val(weightInput),

      rate: val(rateInput),
      otherCharges: val(otherChargesInput) || '0',
      discount: val(discountInput) || '0',
      taxMode: val(taxModeInput) || 'none',
      taxRate: val(taxRateInput) || '0',
      remarks: val(remarksInput) || 'NA',

      freight: calc.freight,
      taxable: calc.taxable,
      grandTotal: calc.grandTotal,
      amountInWords: calc.words,
      updatedAt: new Date().toISOString(),
    };
  };

  // --- Validate Mandatory Fields ---
  const validateForm = () => {
    const requiredFields = [
      { el: invoiceNumberInput, name: 'Invoice Number' },
      { el: invoiceDateInput, name: 'Invoice Date' },
      { el: customerNameInput, name: 'Customer Name' },
      { el: customerGstinInput, name: 'Customer GSTIN' },
      { el: customerAddressInput, name: 'Customer Address' },
      { el: customerStateInput, name: 'Customer State' },
      { el: customerStateCodeInput, name: 'Customer State Code' },
      { el: lrNumberInput, name: 'LR Number' },
      { el: lrDateInput, name: 'LR Date' },
      { el: loadingLocationInput, name: 'Loading Location' },
      { el: unloadingLocationInput, name: 'Unloading Location' },
      { el: vehicleNumberInput, name: 'Vehicle Number' },
      { el: goodsDescriptionInput, name: 'Goods Description' },
      { el: packagesInput, name: 'No. of Bags' },
      { el: weightInput, name: 'Weight' },
      { el: rateInput, name: 'Rate' },
    ];

    for (const field of requiredFields) {
      if (!val(field.el)) {
        field.el?.focus();
        showStatus('error', `Please fill in the required field: ${field.name}`);
        return false;
      }
    }
    return true;
  };

  // --- File Download Utility ---
  const downloadFile = (blobUrl, filename) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 150);
  };

  // --- Client-Side Word DOCX Generation (100% Online) ---
  const generateDocxClient = async (data, autoDownload = false) => {
    if (!window.JSZip) {
      throw new Error('Word template engine is still loading. Please try again in a moment.');
    }

    // 1. Fetch the master template (always fresh, bypassing any browser cache)
    const resp = await fetch('templates/11048.docx?v=' + Date.now());
    if (!resp.ok) {
      throw new Error('Master Word template not found at templates/11048.docx');
    }
    const arrayBuffer = await resp.arrayBuffer();

    // 2. Unzip the docx
    const zip = await window.JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('Corrupted docx template structure.');
    }
    let xml = await docFile.async('string');

    // 3. Prepare placeholders
    const [addr1, addr2] = splitAddress(data.customerAddress);
    const w = parseFloat(data.weight) || 0;
    const r = parseFloat(data.rate) || 0;
    const oc = parseFloat(data.otherCharges) || 0;
    const f = w * r;
    const lineTotal = f + oc;

    const docMapping = {
      '{{invoice_number}}': data.invoiceNumber || '-',
      '{{invoice_date}}': formatDate(data.invoiceDate),
      '{{customer_name}}': data.customerName || '-',
      '{{customer_address_1}}': addr1,
      '{{customer_address_2}}': addr2,
      '{{gstin}}': data.customerGstin || '-',
      '{{customer_state}}': data.customerState || '-',
      '{{customer_state_code}}': data.customerStateCode || '-',
      '{{consignor}}': data.consignor || data.customerName || '-',
      '{{consignor_address}}': data.consignorAddress || addr1,
      '{{consignor_gstin}}': data.consignorGstin || data.customerGstin || '-',
      '{{consignor_state_code}}': data.consignorStateCode || data.customerStateCode || '-',
      '{{consignee}}': data.consignee || data.customerName || '-',
      '{{consignee_address}}': data.consigneeAddress || addr1,
      '{{consignee_state_code}}': data.consigneeStateCode || data.customerStateCode || '-',

      '{{sl_no}}': '1',
      '{{lr_number}}': data.lrNumber || '-',
      '{{lr_date}}': formatDate(data.lrDate || data.invoiceDate),
      '{{loading_location}}': data.loadingLocation || '-',
      '{{unloading_location}}': data.unloadingLocation || '-',
      '{{goods_description}}': data.goodsDescription || '-',
      '{{vehicle_number}}': data.vehicleNumber || '-',
      '{{packages}}': data.packages || '-',
      '{{weight}}': w > 0 ? w.toFixed(3) : '-',
      '{{rate}}': r > 0 ? String(r) : '-',
      '{{freight}}': Number.isInteger(f) ? f.toLocaleString('en-IN') : f.toFixed(2),
      '{{other_charges}}': oc > 0 ? String(oc) : '0',
      '{{total}}': Number.isInteger(lineTotal) ? lineTotal.toLocaleString('en-IN') : lineTotal.toFixed(2),

      '{{remarks}}': data.remarks || 'NA',
      '{{grand_total}}': formatCurrency(data.grandTotal),
      '{{amount_in_words}}': data.amountInWords || 'Rupees Zero Only',
    };

    // 4. Substitute placeholders
    for (const [ph, valStr] of Object.entries(docMapping)) {
      xml = xml.split(ph).join(escapeXml(valStr));
    }
    zip.file('word/document.xml', xml);

    // 5. Ensure the SR Transport stamp+sign image is injected into docx media
    try {
      const imgResp = await fetch('stamp_with_sign.png?v=' + Date.now());
      if (imgResp.ok) {
        const imgBuffer = await imgResp.arrayBuffer();
        zip.file('word/media/image3.png', imgBuffer);
        zip.file('word/media/image4.png', imgBuffer);
      }
    } catch (e) {
      // If stamp_with_sign.png fetch fails, template already contains it
    }

    // 6. Generate DOCX Blob
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    const filename = `Invoice-${data.invoiceNumber || 'invoice'}.docx`;
    const blobUrl = URL.createObjectURL(blob);

    if (autoDownload) {
      downloadFile(blobUrl, filename);
    }

    return { filename, url: blobUrl, blob };
  };

  // --- Client-Side High-Res A4 Landscape PDF Generation (100% Online) ---
  const generatePdfClient = async (data, autoDownload = false) => {
    if (!window.html2canvas || !window.jspdf) {
      throw new Error('PDF generator library is loading. Please wait a moment and try again.');
    }

    const sheet = document.getElementById('invoiceSheet');
    if (!sheet) throw new Error('Invoice sheet element not found');

    // Clone element off-screen for crisp fixed-size rendering
    let clone = null;
    try {
      clone = sheet.cloneNode(true);
      clone.id = 'invoiceSheetPdfClone';
      clone.style.width = '1050px';
      clone.style.maxWidth = '1050px';
      clone.style.minWidth = '1050px';
      clone.style.height = 'auto';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.background = '#ffffff';
      clone.style.boxShadow = 'none';
      clone.style.margin = '0';
      clone.style.zIndex = '-9999';
      document.body.appendChild(clone);

      // Wait for all images in clone (logo, stamp, signature)
      const imgs = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 80));

      const canvas = await window.html2canvas(clone, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 1050,
        height: clone.offsetHeight,
        windowWidth: 1200,
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = 297;
      const pageHeight = 210;

      const margin = 5;
      const printableW = pageWidth - margin * 2;
      const printableH = pageHeight - margin * 2;

      const canvasRatio = canvas.height / canvas.width;
      let renderW = printableW;
      let renderH = renderW * canvasRatio;

      if (renderH > printableH) {
        renderH = printableH;
        renderW = renderH / canvasRatio;
      }

      const x = margin + (printableW - renderW) / 2;
      const y = margin + (printableH - renderH) / 2;

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', x, y, renderW, renderH, undefined, 'FAST');
      const pdfFilename = `Invoice-${data.invoiceNumber || 'invoice'}.pdf`;

      const pdfBlob = pdf.output('blob');
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);

      if (autoDownload) {
        downloadFile(pdfBlobUrl, pdfFilename);
      }

      return { filename: pdfFilename, url: pdfBlobUrl, blob: pdfBlob };
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  };

  // --- Local History Management ---
  const loadSavedInvoices = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);

      // Migrate from v2 if available
      const oldV2 = localStorage.getItem('transbill_invoices_data_v2');
      if (oldV2) {
        const parsed = JSON.parse(oldV2);
        return parsed.map((item) => {
          const lr0 = item.lrs && item.lrs[0] ? item.lrs[0] : {};
          return {
            ...item,
            lrNumber: lr0.lrNumber || item.lrNumber || '11403',
            lrDate: lr0.lrDate || item.lrDate || item.invoiceDate,
            loadingLocation: lr0.loadingLocation || item.loadingLocation || 'Medchal',
            unloadingLocation: lr0.unloadingLocation || item.unloadingLocation || 'Kalakal',
            vehicleNumber: lr0.vehicleNumber || item.vehicleNumber || 'AP 28 X 7948',
            goodsDescription: lr0.goodsDescription || item.goodsDescription || 'Seeds',
            packages: lr0.packages || item.packages || '273',
            weight: lr0.weight || item.weight || '10.000',
            rate: lr0.rate || item.rate || '700',
            otherCharges: lr0.otherCharges || item.otherCharges || '0',
          };
        });
      }
    } catch (e) {}
    return [];
  };

  const saveToLocalInvoices = (invoiceData) => {
    try {
      const list = loadSavedInvoices();
      const existingIdx = list.findIndex((i) => String(i.invoiceNumber) === String(invoiceData.invoiceNumber));
      if (existingIdx >= 0) {
        list[existingIdx] = invoiceData;
      } else {
        list.unshift(invoiceData);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      state.invoices = list;
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  };

  const deleteFromLocalInvoices = (invNum) => {
    try {
      let list = loadSavedInvoices();
      list = list.filter((i) => String(i.invoiceNumber) !== String(invNum));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      state.invoices = list;
    } catch (e) {}
  };

  const calculateNextInvoiceNumber = () => {
    const list = loadSavedInvoices();
    let maxNum = BASELINE_INVOICE_NUM;
    list.forEach((i) => {
      const n = parseInt(i.invoiceNumber, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    return String(maxNum + 1);
  };

  const renderHistoryTable = (filterText = '') => {
    if (!historyTableBody) return;
    const list = state.invoices;
    const filter = (filterText || '').toLowerCase().trim();

    const filtered = filter
      ? list.filter(
          (i) =>
            String(i.invoiceNumber).includes(filter) ||
            (i.customerName || '').toLowerCase().includes(filter) ||
            (i.lrNumber || '').toLowerCase().includes(filter)
        )
      : list;

    setText(historyCountBadge, `${filtered.length} record${filtered.length === 1 ? '' : 's'}`);

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            ${filter ? 'No matching invoices found.' : 'No saved invoices yet. Generated invoices will appear here.'}
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = filtered
      .map(
        (inv) => `
      <tr data-inv="${escapeXml(inv.invoiceNumber)}">
        <td><strong>#${escapeXml(inv.invoiceNumber)}</strong></td>
        <td>${escapeXml(formatDate(inv.invoiceDate))}</td>
        <td title="${escapeXml(inv.customerName || '')}">${escapeXml((inv.customerName || '').slice(0, 28))}${inv.customerName && inv.customerName.length > 28 ? '...' : ''}</td>
        <td><span class="lr-pill">${escapeXml(inv.lrNumber || '-')}</span></td>
        <td><strong>₹ ${formatCurrency(inv.grandTotal)}</strong></td>
        <td class="actions-col">
          <button type="button" class="action-btn edit" title="Load and edit this invoice" data-action="edit" data-inv="${escapeXml(inv.invoiceNumber)}">✏️ Edit</button>
          <button type="button" class="action-btn word" title="Download Word (.docx)" data-action="word" data-inv="${escapeXml(inv.invoiceNumber)}">📄 Word</button>
          <button type="button" class="action-btn pdf" title="Download PDF" data-action="pdf" data-inv="${escapeXml(inv.invoiceNumber)}">📑 PDF</button>
          <button type="button" class="action-btn delete" title="Delete record" data-action="delete" data-inv="${escapeXml(inv.invoiceNumber)}">🗑️</button>
        </td>
      </tr>
    `
      )
      .join('');
  };

  // --- Load Invoice into Form for Editing ---
  const loadInvoiceIntoForm = (inv) => {
    state.mode = 'edit';
    state.editingInvoiceNumber = String(inv.invoiceNumber);

    setText(draftStatus, `Editing #${inv.invoiceNumber}`);
    if (draftStatus) draftStatus.className = 'draft-badge editing';
    setText(headerModeBadge, `Mode: Editing #${inv.invoiceNumber}`);
    setText(editorHeading, `Edit Invoice #${inv.invoiceNumber}`);
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

    setVal(invoiceNumberInput, inv.invoiceNumber);
    setVal(invoiceDateInput, parseDateToIso(inv.invoiceDate));

    setVal(customerNameInput, inv.customerName);
    setVal(customerGstinInput, inv.customerGstin);
    setVal(customerAddressInput, inv.customerAddress);
    setVal(customerStateInput, inv.customerState);
    setVal(customerStateCodeInput, inv.customerStateCode);

    setVal(consignorInput, inv.consignor);
    setVal(consigneeInput, inv.consignee);
    setVal(consignorAddressInput, inv.consignorAddress);
    setVal(consigneeAddressInput, inv.consigneeAddress);
    setVal(consignorGstinInput, inv.consignorGstin);
    setVal(consignorStateCodeInput, inv.consignorStateCode);

    setVal(lrNumberInput, inv.lrNumber);
    setVal(lrDateInput, parseDateToIso(inv.lrDate || inv.invoiceDate));
    setVal(loadingLocationInput, inv.loadingLocation);
    setVal(unloadingLocationInput, inv.unloadingLocation);
    setVal(vehicleNumberInput, inv.vehicleNumber);
    setVal(goodsDescriptionInput, inv.goodsDescription);
    setVal(packagesInput, inv.packages);
    setVal(weightInput, inv.weight);

    setVal(rateInput, inv.rate);
    setVal(otherChargesInput, inv.otherCharges || '0');
    setVal(discountInput, inv.discount || '0');
    setVal(taxModeInput, inv.taxMode || 'none');
    setVal(taxRateInput, inv.taxRate || '0');
    setVal(remarksInput, inv.remarks || 'NA');

    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showStatus('info', `Loaded Invoice #${inv.invoiceNumber} into editor. Edit fields and click "Generate Invoice" to update.`);
  };

  const exitEditMode = () => {
    state.mode = 'new';
    state.editingInvoiceNumber = null;

    setText(draftStatus, 'New Draft');
    if (draftStatus) draftStatus.className = 'draft-badge';
    setText(headerModeBadge, 'Mode: New Invoice');
    setText(editorHeading, 'Create a Freight Invoice');
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';

    setVal(invoiceNumberInput, calculateNextInvoiceNumber());
    updatePreview();
  };

  // --- Reset Form to Clean Defaults ---
  const resetFormToDefault = () => {
    form.reset();
    state.mode = 'new';
    state.editingInvoiceNumber = null;

    setText(draftStatus, 'New Draft');
    if (draftStatus) draftStatus.className = 'draft-badge';
    setText(headerModeBadge, 'Mode: New Invoice');
    setText(editorHeading, 'Create a Freight Invoice');
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';

    const today = new Date().toISOString().slice(0, 10);
    setVal(invoiceDateInput, today);
    setVal(lrDateInput, today);
    setVal(invoiceNumberInput, calculateNextInvoiceNumber());
    setVal(taxModeInput, 'none');
    setVal(remarksInput, 'NA');
    setVal(otherChargesInput, '0');
    setVal(discountInput, '0');
    setVal(taxRateInput, '0');

    updatePreview();
  };

  // --- Fill Sample Data ---
  const fillSampleData = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextNum = val(invoiceNumberInput) || calculateNextInvoiceNumber();

    setVal(invoiceNumberInput, nextNum);
    setVal(invoiceDateInput, today);

    setVal(customerNameInput, 'GREEN AGREVOLUTION PRIVATE LTD');
    setVal(customerGstinInput, '09AAECG6456H1ZC');
    setVal(customerAddressInput, 'B-103/104, Gomti Nagar, Vibhuti Khand Gomti Nagar,\nLucknow - 226010\nUTTAR PRADESH');
    setVal(customerStateInput, 'UTTAR PRADESH');
    setVal(customerStateCodeInput, '09/UP');

    setVal(consignorInput, 'GREEN AGREVOLUTION PRIVATE LTD');
    setVal(consigneeInput, 'GREEN AGREVOLUTION PVT LTD');
    setVal(consignorAddressInput, 'C/O GREEN AGREVOLUTION PVT LTD, Medchal\nMedchal\nTELANGANA');
    setVal(consigneeAddressInput, 'C/O Green Agrevolution Pvt Ltd, Medchal\nMedchal\nTELANGANA');
    setVal(consignorGstinInput, '36AAECG6456H1ZF');
    setVal(consignorStateCodeInput, '36/TS');

    setVal(lrNumberInput, '11403');
    setVal(lrDateInput, today);
    setVal(loadingLocationInput, 'Medchal');
    setVal(unloadingLocationInput, 'Kalakal');
    setVal(vehicleNumberInput, 'AP 28 X 7948');
    setVal(goodsDescriptionInput, 'Seeds');
    setVal(packagesInput, '273');
    setVal(weightInput, '10.000');

    setVal(rateInput, '700');
    setVal(otherChargesInput, '0');
    setVal(discountInput, '0');
    setVal(taxModeInput, 'none');
    setVal(taxRateInput, '0');
    setVal(remarksInput, 'NA');

    updatePreview();
    showStatus('info', 'Loaded sample transport invoice for Green Agrevolution.');
  };

  // --- Event Listeners ---

  // Live input listening
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  // Quick Chips
  if (chipGreenAgro) chipGreenAgro.addEventListener('click', fillSampleData);
  if (chipClear) chipClear.addEventListener('click', resetFormToDefault);
  if (fillSampleButton) fillSampleButton.addEventListener('click', fillSampleData);
  if (clearFormButton) clearFormButton.addEventListener('click', resetFormToDefault);
  if (resetButton) resetButton.addEventListener('click', resetFormToDefault);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', exitEditMode);

  // History search
  if (historySearchInput) {
    historySearchInput.addEventListener('input', (e) => {
      renderHistoryTable(e.target.value);
    });
  }

  // Refresh history
  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', () => {
      state.invoices = loadSavedInvoices();
      renderHistoryTable(historySearchInput?.value || '');
      showStatus('info', 'Invoice history refreshed.');
    });
  }

  // History table row action delegations
  if (historyTableBody) {
    historyTableBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      const invNum = btn.dataset.inv;
      const inv = state.invoices.find((i) => String(i.invoiceNumber) === String(invNum));
      if (!inv) return;

      if (action === 'edit') {
        loadInvoiceIntoForm(inv);
      } else if (action === 'word') {
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await generateDocxClient(inv, true);
        } catch (err) {
          alert('Could not download Word: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = '📄 Word';
        }
      } else if (action === 'pdf') {
        btn.disabled = true;
        btn.textContent = '...';
        try {
          loadInvoiceIntoForm(inv);
          await new Promise((r) => setTimeout(r, 60));
          await generatePdfClient(inv, true);
        } catch (err) {
          alert('Could not download PDF: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = '📑 PDF';
        }
      } else if (action === 'delete') {
        if (confirm(`Are you sure you want to delete Invoice #${invNum}?`)) {
          deleteFromLocalInvoices(invNum);
          renderHistoryTable(historySearchInput?.value || '');
          showStatus('info', `Invoice #${invNum} deleted.`);
        }
      }
    });
  }

  // Save Draft Button
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const data = serializeInvoiceData();
      saveToLocalInvoices(data);
      renderHistoryTable(historySearchInput?.value || '');
      showStatus('info', `Draft saved locally for Invoice #${data.invoiceNumber}.`);
    });
  }

  // Print Dialog Button
  if (printPdfButton) {
    printPdfButton.addEventListener('click', () => {
      if (!validateForm()) return;
      updatePreview();
      window.print();
    });
  }

  // Download Word Only Button
  if (downloadDocxButton) {
    downloadDocxButton.addEventListener('click', async () => {
      if (!validateForm()) return;
      const data = serializeInvoiceData();
      downloadDocxButton.disabled = true;
      downloadDocxButton.textContent = 'Generating Word...';
      showStatus('info', `Generating Word document for Invoice #${data.invoiceNumber}...`);

      try {
        const docxRes = await generateDocxClient(data, true);
        saveToLocalInvoices(data);
        renderHistoryTable(historySearchInput?.value || '');
        showStatus('success', `Word invoice downloaded successfully for #${data.invoiceNumber}.`, docxRes.url, docxRes.filename);
      } catch (err) {
        showStatus('error', 'Word generation error: ' + err.message);
      } finally {
        downloadDocxButton.disabled = false;
        downloadDocxButton.textContent = 'Download Word (.docx)';
      }
    });
  }

  // Download PDF Only Button
  if (downloadPdfButton) {
    downloadPdfButton.addEventListener('click', async () => {
      if (!validateForm()) return;
      const data = serializeInvoiceData();
      downloadPdfButton.disabled = true;
      downloadPdfButton.textContent = 'Generating PDF...';
      showStatus('info', `Generating high-res PDF for Invoice #${data.invoiceNumber}...`);

      try {
        const pdfRes = await generatePdfClient(data, true);
        saveToLocalInvoices(data);
        renderHistoryTable(historySearchInput?.value || '');
        showStatus('success', `PDF invoice downloaded successfully for #${data.invoiceNumber}.`, null, null, pdfRes.url, pdfRes.filename);
      } catch (err) {
        showStatus('error', 'PDF generation error: ' + err.message);
      } finally {
        downloadPdfButton.disabled = false;
        downloadPdfButton.textContent = 'Download PDF';
      }
    });
  }

  // Primary Submit Action: Generate Invoice (Both Word & PDF)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = serializeInvoiceData();
    printButton.disabled = true;
    printButton.textContent = 'Generating Word & PDF...';
    showStatus('info', `Generating both Word and PDF invoices for #${data.invoiceNumber}...`);

    try {
      // 1. Generate and download Word (.docx)
      const docxRes = await generateDocxClient(data, true);

      // Brief delay so browser handles downloads cleanly
      await new Promise((resolve) => setTimeout(resolve, 350));

      // 2. Generate and download PDF
      const pdfRes = await generatePdfClient(data, true);

      // 3. Save to localStorage database
      saveToLocalInvoices(data);
      renderHistoryTable(historySearchInput?.value || '');

      showStatus(
        'success',
        `Invoice #${data.invoiceNumber} generated! Both Word (.docx) and PDF downloaded.`,
        docxRes.url,
        docxRes.filename,
        pdfRes.url,
        pdfRes.filename
      );
    } catch (err) {
      showStatus('error', 'Invoice generation error: ' + err.message);
    } finally {
      printButton.disabled = false;
      printButton.textContent = 'Generate Invoice (Word & PDF)';
    }
  });

  // --- Initial Page Load ---
  const init = () => {
    state.invoices = loadSavedInvoices();

    // Default dates & invoice number
    const today = new Date().toISOString().slice(0, 10);
    setVal(invoiceDateInput, today);
    setVal(lrDateInput, today);

    const nextInv = calculateNextInvoiceNumber();
    setVal(invoiceNumberInput, nextInv);

    // Initial fill from sample if first time
    fillSampleData();

    // Set invoice number to next number
    setVal(invoiceNumberInput, nextInv);
    updatePreview();

    // Render saved invoices table
    renderHistoryTable();
  };

  init();
})();
