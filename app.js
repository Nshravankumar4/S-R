const form = document.getElementById('invoiceForm');
const statusBox = document.getElementById('statusBox');
const draftBadge = document.getElementById('draftStatus');
const printButton = document.getElementById('printButton');
const downloadPdfButton = document.getElementById('downloadPdfButton');
const downloadDocxButton = document.getElementById('downloadDocxButton');
const printPdfButton = document.getElementById('printPdfButton');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const clearFormButton = document.getElementById('clearFormButton');
const fillSampleButton = document.getElementById('fillSampleButton');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const historyKey = 'transbill-invoices';

const fields = Array.from(form.querySelectorAll('input, textarea, select'));

const value = (id) => (document.getElementById(id)?.value || '').trim();

const text = (id, content) => {
  const el = document.getElementById(id);
  if (el) el.textContent = content;
};

const currency = (num) =>
  `INR ${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const moneyWords = (num) => {
  const n = Math.round(Number(num || 0));
  if (n <= 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (val) => {
    if (val < 20) return ones[val];
    if (val < 100) return `${tens[Math.floor(val / 10)]} ${ones[val % 10]}`.trim();
    return `${ones[Math.floor(val / 100)]} Hundred ${convertBelowThousand(val % 100)}`.trim();
  };

  let val = n;
  const parts = [];
  const units = [
    { divisor: 10000000, label: 'Crore' },
    { divisor: 100000, label: 'Lakh' },
    { divisor: 1000, label: 'Thousand' }
  ];

  for (const { divisor, label } of units) {
    const count = Math.floor(val / divisor);
    if (count > 0) {
      parts.push(`${convertBelowThousand(count)} ${label}`);
      val %= divisor;
    }
  }
  if (val > 0) {
    parts.push(convertBelowThousand(val));
  }
  return `Rupees ${parts.join(' ')} Only`.replace(/\s+/g, ' ');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const updatePreview = () => {
  const weight = Number(value('weight') || 0);
  const rate = Number(value('rate') || 0);
  const freight = weight * rate;
  const otherCharges = Number(value('otherCharges') || 0);
  const discount = Number(value('discount') || 0);
  const taxable = freight + otherCharges - discount;

  const taxMode = value('taxMode');
  const taxRate = Number(value('taxRate') || 0);
  let tax = 0;
  if (taxMode === 'igst' || taxMode === 'split') {
    tax = taxable * (taxRate / 100);
  }
  const grandTotal = Math.round(taxable + tax);

  text('previewInvoiceNumber', value('invoiceNumber') || '11048');
  text('previewInvoiceDate', formatDate(value('invoiceDate')));
  text('previewLrNumber', value('lrNumber') || '-');
  text('previewLrDate', formatDate(value('lrDate') || value('invoiceDate')));

  text('previewCustomerName', value('customerName') || 'CUSTOMER NAME');
  text('previewCustomerAddress', value('customerAddress') || '-');
  text('previewCustomerGstin', value('customerGstin') || '-');
  text('previewCustomerState', value('customerState') || '-');
  text('previewCustomerStateCode', value('customerStateCode') || '-');

  text('previewConsignor', value('consignor') || value('customerName') || '-');
  text('previewConsignee', value('consignee') || value('customerName') || '-');

  text('previewLoading', value('loadingLocation') || '-');
  text('previewUnloading', value('unloadingLocation') || '-');
  text('previewDescription', value('goodsDescription') || '-');
  text('previewVehicle', value('vehicleNumber') || '-');
  text('previewPackages', value('packages') || '-');

  text('previewWeight', weight > 0 ? weight.toFixed(3) : '-');
  text('previewRate', rate > 0 ? rate.toLocaleString('en-IN') : '-');
  text('previewFreight', freight > 0 ? freight.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-');
  text('previewOtherCharges', otherCharges.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  text('previewTotal', (freight + otherCharges).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  text('previewGrandTotal', `₹ ${grandTotal.toLocaleString('en-IN')}`);
  text('previewWords', moneyWords(grandTotal));
  text('previewRemarks', value('remarks') || 'NA');

  text('freightLive', currency(freight));
  text('taxableLive', currency(taxable));
  text('totalLive', currency(grandTotal));
};

let lastGeneratedResult = null;

const showStatus = (type, message, downloadUrl = null, filename = null, pdfUrl = null, pdfFilename = null) => {
  if (!statusBox) return;
  statusBox.className = `status-box ${type}`;
  if (type === 'success' && (downloadUrl || pdfUrl)) {
    let html = `
      <strong>Invoice generated successfully.</strong><br>
      <span>Invoice Number: <strong>${value('invoiceNumber')}</strong></span><br>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
    `;
    if (pdfUrl && pdfFilename) {
      html += `<a class="download-btn" style="background:#1d4ed8;" href="${pdfUrl}" download="${pdfFilename}">Download ${pdfFilename} (PDF)</a>`;
    }
    if (downloadUrl && filename) {
      html += `<a class="download-btn" href="${downloadUrl}" download="${filename}">Download ${filename} (Word)</a>`;
    }
    html += `</div>`;
    statusBox.innerHTML = html;
  } else {
    statusBox.textContent = message;
  }
  statusBox.style.display = 'block';
};

const hideStatus = () => {
  if (statusBox) statusBox.style.display = 'none';
};

const serialize = () => Object.fromEntries(new FormData(form).entries());

const restore = (data) => {
  fields.forEach((field) => {
    if (data[field.name || field.id] !== undefined) {
      field.value = data[field.name || field.id];
    }
  });
  updatePreview();
};

const renderHistory = () => {
  const records = JSON.parse(localStorage.getItem(historyKey) || '[]');
  if (historyCount) historyCount.textContent = `${records.length} saved`;
  if (!historyList) return;

  if (!records.length) {
    historyList.innerHTML = '<p class="empty-state">Saved drafts will appear here.</p>';
    return;
  }

  historyList.innerHTML = records
    .slice()
    .reverse()
    .map(
      (rec, idx) => `
      <div class="history-item">
        <div>
          <strong>Invoice ${rec.invoiceNumber || '-'}</strong>
          <small>${rec.customerName || 'No customer'} | ${rec.invoiceDate || 'No date'}</small>
        </div>
        <button type="button" data-history="${records.length - 1 - idx}">Load</button>
      </div>`
    )
    .join('');

  historyList.querySelectorAll('[data-history]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.history);
      restore(records[idx]);
      if (draftBadge) draftBadge.textContent = 'Loaded';
      hideStatus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
};

const saveCurrentDraft = () => {
  const data = serialize();
  const records = JSON.parse(localStorage.getItem(historyKey) || '[]');
  records.push(data);
  localStorage.setItem(historyKey, JSON.stringify(records.slice(-20)));
  if (draftBadge) draftBadge.textContent = 'Saved';
  renderHistory();
  showStatus('info', `Draft saved locally for invoice ${data.invoiceNumber || '-'}.`);
};

const resetInvoiceForm = () => {
  form.reset();
  const today = new Date().toISOString().slice(0, 10);
  const invDateEl = document.getElementById('invoiceDate');
  const lrDateEl = document.getElementById('lrDate');
  if (invDateEl) invDateEl.value = today;
  if (lrDateEl) lrDateEl.value = today;
  const taxModeEl = document.getElementById('taxMode');
  if (taxModeEl) taxModeEl.value = 'none';
  if (draftBadge) draftBadge.textContent = 'New invoice';
  hideStatus();
  updatePreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Listeners
fields.forEach((field) => field.addEventListener('input', updatePreview));

const fillSampleData = () => {
  const sample = {
    invoiceNumber: '11052',
    invoiceDate: new Date().toISOString().slice(0, 10),
    lrNumber: '11406',
    lrDate: new Date().toISOString().slice(0, 10),
    customerName: 'GREEN AGREVOLUTION PRIVATE LTD',
    customerGstin: '09AAECG6456H1ZC',
    customerAddress: 'B-103/104, Gomti Nagar, Vibhuti Khand Gomti Nagar,\nLucknow - 226010 UTTAR PRADESH',
    customerState: 'UTTAR PRADESH',
    customerStateCode: '09/UP',
    consignor: 'GREEN AGREVOLUTION PRIVATE LTD',
    consignorAddress: 'C/O GREEN AGREVOLUTION PVT LTD, Medchal',
    consignorGstin: '36AAECG6456H1ZF',
    consignorStateCode: '36/TS',
    consignee: 'GREEN AGREVOLUTION PVT LTD',
    consigneeAddress: 'C/O Green Agrevolution Pvt Ltd, Medchal',
    consigneeStateCode: '36/TS',
    loadingLocation: 'Medchal',
    unloadingLocation: 'Kalakal',
    vehicleNumber: 'AP 28 X 7948',
    goodsDescription: 'Seeds',
    packages: '273',
    weight: '10.000',
    rate: '700',
    otherCharges: '0',
    discount: '0',
    taxMode: 'none',
    taxRate: '0',
    remarks: 'NA',
  };
  restore(sample);
  showStatus('info', 'Sample invoice details filled. You can adjust the values and click Generate invoice DOCX.');
};

if (saveButton) saveButton.addEventListener('click', saveCurrentDraft);
if (resetButton) resetButton.addEventListener('click', resetInvoiceForm);
if (clearFormButton) clearFormButton.addEventListener('click', resetInvoiceForm);
if (fillSampleButton) fillSampleButton.addEventListener('click', fillSampleData);

const chipGreenAgro = document.getElementById('chipGreenAgro');
const chipClear = document.getElementById('chipClear');
if (chipGreenAgro) chipGreenAgro.addEventListener('click', fillSampleData);
if (chipClear) chipClear.addEventListener('click', resetInvoiceForm);

const validateForm = () => {
  const validations = [
    { id: 'invoiceNumber', name: 'Invoice Number' },
    { id: 'invoiceDate', name: 'Invoice Date' },
    { id: 'customerName', name: 'Customer Name' },
    { id: 'vehicleNumber', name: 'Vehicle Number' },
    { id: 'weight', name: 'Weight' },
    { id: 'rate', name: 'Rate' },
  ];

  for (const item of validations) {
    if (!value(item.id)) {
      document.getElementById(item.id)?.focus();
      showStatus('error', `Please enter ${item.name}.`);
      return false;
    }
  }
  return true;
};

const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

if (downloadPdfButton) {
  downloadPdfButton.addEventListener('click', async () => {
    hideStatus();
    if (!validateForm()) return;
    updatePreview();

    const currentInvNum = value('invoiceNumber');

    // If already generated and matching, download directly
    if (lastGeneratedResult && lastGeneratedResult.pdfUrl && lastGeneratedResult.invoiceNumber === currentInvNum) {
      downloadFile(lastGeneratedResult.pdfUrl, lastGeneratedResult.pdfFilename || `Invoice-${currentInvNum}.pdf`);
      showStatus('success', 'PDF downloaded successfully.', lastGeneratedResult.url, lastGeneratedResult.filename, lastGeneratedResult.pdfUrl, lastGeneratedResult.pdfFilename);
      return;
    }

    downloadPdfButton.disabled = true;
    downloadPdfButton.textContent = 'Generating PDF...';
    showStatus('info', 'Generating PDF...');

    try {
      const data = serialize();
      // 1. Try server API if available
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.ok && resJson.pdfUrl) {
            lastGeneratedResult = resJson;
            downloadFile(resJson.pdfUrl, resJson.pdfFilename);
            showStatus('success', 'PDF generated from Word template.', resJson.url, resJson.filename, resJson.pdfUrl, resJson.pdfFilename);
            return;
          }
        }
      } catch (srvErr) {}

      // 2. Client-side PDF fallback (for GitHub Pages)
      const pdfRes = await generatePdfClient(data, true);
      lastGeneratedResult = {
        ...(lastGeneratedResult || {}),
        invoiceNumber: data.invoiceNumber,
        pdfFilename: pdfRes.pdfFilename,
        pdfUrl: pdfRes.pdfUrl,
      };
      showStatus('success', 'PDF downloaded successfully.', lastGeneratedResult.url, lastGeneratedResult.filename, pdfRes.pdfUrl, pdfRes.pdfFilename);
    } catch (err) {
      showStatus('error', 'PDF generation error: ' + err.message);
    } finally {
      downloadPdfButton.disabled = false;
      downloadPdfButton.textContent = 'Download PDF';
    }
  });
}

if (downloadDocxButton) {
  downloadDocxButton.addEventListener('click', async () => {
    hideStatus();
    if (!validateForm()) return;
    updatePreview();

    const currentInvNum = value('invoiceNumber');

    if (lastGeneratedResult && lastGeneratedResult.url && lastGeneratedResult.invoiceNumber === currentInvNum) {
      downloadFile(lastGeneratedResult.url, lastGeneratedResult.filename || `Invoice-${currentInvNum}.docx`);
      showStatus('success', 'Word invoice downloaded.', lastGeneratedResult.url, lastGeneratedResult.filename, lastGeneratedResult.pdfUrl, lastGeneratedResult.pdfFilename);
      return;
    }

    downloadDocxButton.disabled = true;
    downloadDocxButton.textContent = 'Generating Word...';
    showStatus('info', 'Generating Word document (.docx)...');

    try {
      const data = serialize();
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.ok && resJson.url) {
            lastGeneratedResult = resJson;
            downloadFile(resJson.url, resJson.filename);
            showStatus('success', 'Word invoice downloaded.', resJson.url, resJson.filename, resJson.pdfUrl, resJson.pdfFilename);
            return;
          }
        }
      } catch (srvErr) {}

      const docxRes = await generateDocxClient(data, true);
      lastGeneratedResult = {
        ...(lastGeneratedResult || {}),
        invoiceNumber: data.invoiceNumber,
        filename: docxRes.filename,
        url: docxRes.url,
      };
      showStatus('success', 'Word invoice downloaded.', docxRes.url, docxRes.filename, lastGeneratedResult.pdfUrl, lastGeneratedResult.pdfFilename);
    } catch (err) {
      showStatus('error', 'Word generation error: ' + err.message);
    } finally {
      downloadDocxButton.disabled = false;
      downloadDocxButton.textContent = 'Download Word (.docx)';
    }
  });
}

if (printPdfButton) {
  printPdfButton.addEventListener('click', () => {
    hideStatus();
    if (!validateForm()) return;
    updatePreview();
    window.print();
  });
}

const escapeXml = (unsafe) => {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
  });
};

const splitAddress = (addr) => {
  const raw = String(addr || '').trim();
  if (!raw) return ['-', '-'];
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return [lines[0], lines.slice(1).join(', ')];
  if (raw.length > 40 && raw.includes(',')) {
    const idx = raw.indexOf(',', 25);
    if (idx !== -1) return [raw.slice(0, idx).trim(), raw.slice(idx + 1).trim()];
  }
  return [raw, '-'];
};

const generateDocxClient = async (data, autoDownload = false) => {
  if (!window.JSZip) {
    throw new Error('Word template engine is still loading. Please try again.');
  }

  const resp = await fetch('templates/11048.docx');
  if (!resp.ok) {
    throw new Error('Master Word template not found at templates/11048.docx');
  }
  const arrayBuffer = await resp.arrayBuffer();

  const zip = await window.JSZip.loadAsync(arrayBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Corrupted docx template structure.');
  }
  let xml = await docFile.async('string');

  const weight = Number(data.weight || 0);
  const rate = Number(data.rate || 0);
  const freight = weight * rate;
  const otherCharges = Number(data.otherCharges || 0);
  const discount = Number(data.discount || 0);
  const taxable = freight + otherCharges - discount;

  const taxMode = data.taxMode || 'none';
  const taxRate = Number(data.taxRate || 0);
  let tax = 0;
  if (taxMode === 'igst' || taxMode === 'split') {
    tax = taxable * (taxRate / 100);
  }
  const grandTotal = Math.round(taxable + tax);

  const [addr1, addr2] = splitAddress(data.customerAddress);
  const invDate = formatDate(data.invoiceDate);
  const lrDate = formatDate(data.lrDate || data.invoiceDate);

  const mapping = {
    '{{invoice_number}}': data.invoiceNumber || '-',
    '{{invoice_date}}': invDate,
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
    '{{lr_date}}': lrDate,
    '{{loading_location}}': data.loadingLocation || '-',
    '{{unloading_location}}': data.unloadingLocation || '-',
    '{{goods_description}}': data.goodsDescription || '-',
    '{{vehicle_number}}': data.vehicleNumber || '-',
    '{{packages}}': data.packages || '-',
    '{{weight}}': weight > 0 ? weight.toFixed(3) : '-',
    '{{rate}}': rate > 0 ? String(rate) : '-',
    '{{freight}}': Number.isInteger(freight) ? freight.toLocaleString('en-IN') : freight.toFixed(2),
    '{{other_charges}}': otherCharges > 0 ? String(otherCharges) : '0',
    '{{total}}': (freight + otherCharges).toLocaleString('en-IN'),
    '{{remarks}}': data.remarks || 'NA',
    '{{grand_total}}': grandTotal.toLocaleString('en-IN'),
    '{{amount_in_words}}': moneyWords(grandTotal),
  };

  for (const [ph, val] of Object.entries(mapping)) {
    xml = xml.split(ph).join(escapeXml(val));
  }

  zip.file('word/document.xml', xml);
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

const generatePdfClient = async (data, autoDownload = false) => {
  if (!window.html2canvas || !window.jspdf) {
    throw new Error('PDF library is loading. Please wait a moment and try again.');
  }

  const sheet = document.getElementById('invoiceSheet');
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

    // Ensure images in clone are loaded
    const imgs = Array.from(clone.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
    }));

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

    const blob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(blob);

    if (autoDownload) {
      downloadFile(pdfUrl, pdfFilename);
    }

    return { pdfFilename, pdfUrl, blob };
  } finally {
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  if (!validateForm()) return;
  updatePreview();

  const data = serialize();
  if (printButton) {
    printButton.disabled = true;
    printButton.textContent = 'Generating Invoice...';
  }
  showStatus('info', 'Generating Invoice (Word & PDF)...');

  try {
    let result = null;

    // 1. Try server API if available (e.g. local backend with Word COM conversion)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.ok) {
          result = resJson;
          if (result.pdfUrl) {
            downloadFile(result.pdfUrl, result.pdfFilename);
          } else if (result.url) {
            downloadFile(result.url, result.filename);
          }
        } else if (resJson.error && resJson.error.includes('already exists')) {
          throw new Error(resJson.error);
        }
      }
    } catch (srvErr) {
      if (srvErr.message && srvErr.message.includes('already exists')) {
        throw srvErr;
      }
      // Server not reachable (e.g. GitHub Pages static host) -> fallback to browser generation
    }

    // 2. Client-side generation (100% in-browser on GitHub Pages)
    if (!result) {
      const docxRes = await generateDocxClient(data, false);
      const pdfRes = await generatePdfClient(data, true); // Automatically downloads PDF to phone
      result = {
        invoiceNumber: data.invoiceNumber,
        filename: docxRes.filename,
        url: docxRes.url,
        pdfFilename: pdfRes.pdfFilename,
        pdfUrl: pdfRes.pdfUrl,
      };
    }

    // Success: show status with download buttons for both Word and PDF
    lastGeneratedResult = result;
    showStatus('success', 'Invoice generated successfully.', result.url, result.filename, result.pdfUrl, result.pdfFilename);
    if (draftBadge) draftBadge.textContent = `Generated: ${result.invoiceNumber}`;

    // Save to local drafts history
    const records = JSON.parse(localStorage.getItem(historyKey) || '[]');
    records.push(data);
    localStorage.setItem(historyKey, JSON.stringify(records.slice(-20)));
    renderHistory();
  } catch (error) {
    showStatus('error', error.message || 'Invoice generation failed. Please try again.');
  } finally {
    if (printButton) {
      printButton.disabled = false;
      printButton.textContent = 'Generate Invoice (Word & PDF)';
    }
  }
});

// Initialization
const todayStr = new Date().toISOString().slice(0, 10);
const invoiceDateInput = document.getElementById('invoiceDate');
const lrDateInput = document.getElementById('lrDate');
if (invoiceDateInput && !invoiceDateInput.value) invoiceDateInput.value = todayStr;
if (lrDateInput && !lrDateInput.value) lrDateInput.value = todayStr;

updatePreview();
renderHistory();
