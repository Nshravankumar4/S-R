const form = document.getElementById('invoiceForm');
const statusBox = document.getElementById('statusBox');
const draftBadge = document.getElementById('draftStatus');
const printButton = document.getElementById('printButton');
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

const showStatus = (type, message, downloadUrl = null, filename = null) => {
  if (!statusBox) return;
  statusBox.className = `status-box ${type}`;
  if (type === 'success' && downloadUrl) {
    statusBox.innerHTML = `
      <strong>Invoice generated successfully.</strong><br>
      <span>Invoice Number: <strong>${value('invoiceNumber')}</strong></span><br>
      <a class="download-btn" href="${downloadUrl}" download="${filename}">Download ${filename}</a>
    `;
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  // Validate required fields
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
      return;
    }
  }

  const data = serialize();
  if (printButton) {
    printButton.disabled = true;
    printButton.textContent = 'Generating DOCX...';
  }
  showStatus('info', 'Generating invoice DOCX...');

  try {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Invoice generation failed. Please try again.');
    }

    // Success: show message with download link
    showStatus('success', 'Invoice generated successfully.', result.url, result.filename);
    if (draftBadge) draftBadge.textContent = `Saved: ${result.filename}`;

    // Automatically trigger file download
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
      printButton.textContent = 'Generate invoice DOCX';
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
