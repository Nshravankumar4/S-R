/**
 * TransBill - Transport Invoice Generation & Management System
 * S&R TRANSPORT
 */

(function () {
  // --- DOM Elements ---
  const form = document.getElementById('invoiceForm');
  const statusBox = document.getElementById('statusBox');
  const draftBadge = document.getElementById('draftStatus');
  const headerModeBadge = document.getElementById('headerModeBadge');
  const editorHeading = document.getElementById('editorHeading');
  const cancelEditBtnTop = document.getElementById('cancelEditBtnTop');
  const cancelEditBtnBottom = document.getElementById('cancelEditBtnBottom');

  const invoiceNumberInput = document.getElementById('invoiceNumber');
  const invoiceDateInput = document.getElementById('invoiceDate');
  const toggleLockInvoiceBtn = document.getElementById('toggleLockInvoiceBtn');

  const lrCountInput = document.getElementById('lrCountInput');
  const incrementLrBtn = document.getElementById('incrementLrBtn');
  const decrementLrBtn = document.getElementById('decrementLrBtn');
  const addLrQuickBtn = document.getElementById('addLrQuickBtn');
  const lrCardsContainer = document.getElementById('lrCardsContainer');

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

  const historyTableBody = document.getElementById('historyTableBody');
  const historySearchInput = document.getElementById('historySearchInput');
  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Modals
  const confirmModal = document.getElementById('confirmModal');
  const confirmModalTitle = document.getElementById('confirmModalTitle');
  const confirmModalBody = document.getElementById('confirmModalBody');
  const executeConfirmBtn = document.getElementById('executeConfirmBtn');
  const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
  const closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');

  const viewModal = document.getElementById('viewModal');
  const viewModalTitle = document.getElementById('viewModalTitle');
  const viewModalBadge = document.getElementById('viewModalBadge');
  const viewModalBody = document.getElementById('viewModalBody');
  const viewModalEditBtn = document.getElementById('viewModalEditBtn');
  const viewModalWordBtn = document.getElementById('viewModalWordBtn');
  const viewModalPdfBtn = document.getElementById('viewModalPdfBtn');
  const viewModalCloseBtn = document.getElementById('viewModalCloseBtn');
  const closeViewModalBtn = document.getElementById('closeViewModalBtn');

  const previewTableBody = document.getElementById('previewTableBody');

  const STORAGE_KEY = 'transbill_invoices_data_v2';
  const BASELINE_INVOICE_NUM = 11048;

  // --- State ---
  const state = {
    mode: 'new', // 'new' | 'edit'
    editingInvoiceNumber: null,
    isInvoiceLocked: true,
    lrs: [
      {
        lrNumber: '11406',
        lrDate: new Date().toISOString().slice(0, 10),
        loadingLocation: 'Medchal',
        unloadingLocation: 'Kalakal',
        goodsDescription: 'Seeds',
        vehicleNumber: 'AP 28 X 7948',
        packages: '273',
        weight: '10.000',
        rate: '700',
        otherCharges: '0',
      },
    ],
    invoices: [],
    viewingInvoice: null,
    lastGeneratedResult: null,
  };

  // --- Helpers ---
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v !== undefined && v !== null ? v : '';
  };
  const text = (id, content) => {
    const el = document.getElementById(id);
    if (el) el.textContent = content;
  };

  const currency = (num) =>
    `INR ${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const moneyWords = (num) => {
    const n = Math.round(Number(num || 0));
    if (n <= 0) return 'Zero Rupees Only';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
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
      { divisor: 1000, label: 'Thousand' },
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

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showStatus = (type, message, downloadUrl = null, filename = null, pdfUrl = null, pdfFilename = null) => {
    if (!statusBox) return;
    statusBox.className = `status-box ${type}`;
    if (type === 'success' && (downloadUrl || pdfUrl)) {
      let html = `
        <strong>${message || 'Invoice generated successfully.'}</strong><br>
        <span>Invoice Number: <strong>${val('invoiceNumber')}</strong></span><br>
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

  // --- Auto Invoice Numbering ---
  const calculateNextInvoiceNumber = () => {
    let maxNum = BASELINE_INVOICE_NUM - 1;

    // Check all invoices in state
    state.invoices.forEach((inv) => {
      const match = String(inv.invoiceNumber || '').match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    // Check localStorage invoices
    const localInvoices = getLocalInvoices();
    localInvoices.forEach((inv) => {
      const match = String(inv.invoiceNumber || '').match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    return String(maxNum + 1);
  };

  const fetchNextInvoiceNumber = async () => {
    if (state.mode === 'edit') return;

    try {
      const resp = await fetch('/api/invoices/next-number');
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.nextInvoiceNumber) {
          setVal('invoiceNumber', data.nextInvoiceNumber);
          updatePreview();
          return;
        }
      }
    } catch (e) {
      // Server offline or static GitHub Pages
    }

    const nextLocal = calculateNextInvoiceNumber();
    setVal('invoiceNumber', nextLocal);
    updatePreview();
  };

  // Toggle invoice lock
  if (toggleLockInvoiceBtn) {
    toggleLockInvoiceBtn.addEventListener('click', () => {
      if (state.mode === 'edit') {
        alert('Invoice Number cannot be changed while editing an existing invoice.');
        return;
      }
      state.isInvoiceLocked = !state.isInvoiceLocked;
      if (state.isInvoiceLocked) {
        invoiceNumberInput.readOnly = true;
        toggleLockInvoiceBtn.textContent = '🔒 Auto';
        toggleLockInvoiceBtn.title = 'Auto-assigned next number. Click to edit manually.';
        fetchNextInvoiceNumber();
      } else {
        invoiceNumberInput.readOnly = false;
        toggleLockInvoiceBtn.textContent = '🔓 Edit';
        toggleLockInvoiceBtn.title = 'Manual mode enabled. Click to revert to auto-number.';
        invoiceNumberInput.focus();
      }
    });
  }

  // --- Calculations ---
  const calculateTotals = () => {
    let totalWeight = 0;
    let totalFreight = 0;
    let totalLineOthers = 0;

    state.lrs.forEach((lr) => {
      const w = parseFloat(lr.weight) || 0;
      const r = parseFloat(lr.rate) || 0;
      const oc = parseFloat(lr.otherCharges) || 0;
      const f = w * r;
      totalWeight += w;
      totalFreight += f;
      totalLineOthers += oc;
    });

    const overallOthers = parseFloat(val('overallOtherCharges')) || 0;
    const discount = parseFloat(val('discount')) || 0;
    const allOthers = totalLineOthers > 0 ? totalLineOthers : overallOthers;

    const taxable = totalFreight + allOthers - discount;
    const taxMode = val('taxMode');
    const taxRate = parseFloat(val('taxRate')) || 0;
    let tax = 0;
    if (taxMode === 'igst' || taxMode === 'split') {
      tax = taxable * (taxRate / 100);
    }
    const grandTotal = Math.max(0, Math.round(taxable + tax));

    return {
      lrCount: state.lrs.length,
      totalWeight,
      totalFreight,
      allOthers,
      discount,
      taxable,
      tax,
      grandTotal,
      words: moneyWords(grandTotal),
    };
  };

  // --- Live Preview Synchronization ---
  const updatePreview = () => {
    const totals = calculateTotals();

    // Bill header & customer details
    const invNum = val('invoiceNumber') || '11049';
    text('previewInvoiceNumber', invNum);
    text('previewInvoiceDate', formatDate(val('invoiceDate')));

    const custName = val('customerName') || 'CUSTOMER COMPANY NAME';
    text('previewCustomerName', custName);
    text('previewCustomerAddress', val('customerAddress') || '-');
    text('previewCustomerGstin', val('customerGstin') || '-');
    text('previewCustomerState', val('customerState') || '-');
    text('previewCustomerStateCode', val('customerStateCode') || '-');

    // Parties
    text('previewConsignor', val('consignor') || custName || '-');
    text('previewConsignorAddress', val('consignorAddress') || val('customerAddress') || '-');
    text('previewConsignorGstin', val('consignorGstin') || val('customerGstin') || '-');
    text('previewConsignorStateCode', val('consignorStateCode') || val('customerStateCode') || '-');

    text('previewConsignee', val('consignee') || custName || '-');
    text('previewConsigneeAddress', val('consigneeAddress') || val('customerAddress') || '-');
    text('previewConsigneeStateCode', val('consigneeStateCode') || val('customerStateCode') || '-');

    // Multi-row preview table
    if (previewTableBody) {
      previewTableBody.innerHTML = '';
      const invDate = val('invoiceDate');

      state.lrs.forEach((lr, idx) => {
        const w = parseFloat(lr.weight) || 0;
        const r = parseFloat(lr.rate) || 0;
        const oc = parseFloat(lr.otherCharges) || 0;
        const f = w * r;
        const lineTotal = f + oc;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${lr.lrNumber || '-'}</td>
          <td>${formatDate(lr.lrDate || invDate)}</td>
          <td>${lr.loadingLocation || '-'}</td>
          <td>${lr.unloadingLocation || '-'}</td>
          <td>${lr.goodsDescription || '-'}</td>
          <td>${lr.vehicleNumber || '-'}</td>
          <td>${lr.packages || '-'}</td>
          <td>${w > 0 ? w.toFixed(3) : '-'}</td>
          <td>${r > 0 ? r.toLocaleString('en-IN') : '-'}</td>
          <td>${f > 0 ? f.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'}</td>
          <td>${oc > 0 ? oc.toLocaleString('en-IN') : '0'}</td>
          <td>${lineTotal > 0 ? lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '-'}</td>
        `;
        previewTableBody.appendChild(tr);
      });

      // Pad with blank rows up to at least 4 rows for consistent layout
      for (let p = state.lrs.length; p < 4; p++) {
        const emptyTr = document.createElement('tr');
        emptyTr.innerHTML = '<td colspan="13">&nbsp;</td>';
        previewTableBody.appendChild(emptyTr);
      }
    }

    // Totals & Note row
    text('previewRemarks', val('remarks') || 'NA');
    text('previewGrandTotal', `₹ ${totals.grandTotal.toLocaleString('en-IN')}`);
    text('previewWords', totals.words);

    // Form calculation strip
    text('calcLrCount', String(totals.lrCount));
    text('calcTotalWeight', `${totals.totalWeight.toFixed(3)} MT`);
    text('calcFreight', currency(totals.totalFreight));
    text('calcTaxable', currency(totals.taxable));
    text('calcGrandTotal', currency(totals.grandTotal));
  };

  // --- Dynamic LR Cards Rendering ---
  const renderLrCards = () => {
    if (!lrCardsContainer) return;
    lrCardsContainer.innerHTML = '';

    if (lrCountInput) lrCountInput.value = state.lrs.length;

    state.lrs.forEach((lr, idx) => {
      const w = parseFloat(lr.weight) || 0;
      const r = parseFloat(lr.rate) || 0;
      const oc = parseFloat(lr.otherCharges) || 0;
      const f = w * r;
      const lineTotal = f + oc;

      const card = document.createElement('div');
      card.className = 'lr-card';
      card.dataset.index = idx;

      card.innerHTML = `
        <div class="lr-card-header">
          <div>
            <span class="lr-card-title">LR #${idx + 1}</span>
            <span class="lr-card-summary">(${lr.vehicleNumber || 'No vehicle'} | ${w > 0 ? w.toFixed(3) + ' MT' : '0 MT'})</span>
          </div>
          ${
            state.lrs.length > 1
              ? `<button type="button" class="lr-remove-btn" data-remove-lr="${idx}">✕ Remove LR</button>`
              : ''
          }
        </div>
        <div class="form-grid three">
          <label>
            LR Number <span class="required-star">*</span>
            <input type="text" data-field="lrNumber" value="${lr.lrNumber || ''}" placeholder="e.g. 11406" required>
          </label>
          <label>
            LR Date <span class="required-star">*</span>
            <input type="date" data-field="lrDate" value="${lr.lrDate || val('invoiceDate') || ''}" required>
          </label>
          <label>
            Vehicle Number <span class="required-star">*</span>
            <input type="text" data-field="vehicleNumber" value="${lr.vehicleNumber || ''}" placeholder="e.g. AP 28 X 7948" style="text-transform:uppercase" required>
          </label>
          <label>
            Loading Location
            <input type="text" data-field="loadingLocation" value="${lr.loadingLocation || ''}" placeholder="e.g. Medchal">
          </label>
          <label>
            Unloading Location
            <input type="text" data-field="unloadingLocation" value="${lr.unloadingLocation || ''}" placeholder="e.g. Kalakal">
          </label>
          <label>
            Goods Description
            <input type="text" data-field="goodsDescription" value="${lr.goodsDescription || ''}" placeholder="e.g. Seeds">
          </label>
          <label>
            No. of Bags / Packages
            <input type="number" min="0" data-field="packages" value="${lr.packages || ''}" placeholder="e.g. 273">
          </label>
          <label>
            Weight (MT / kg) <span class="required-star">*</span>
            <input type="number" min="0" step="0.001" data-field="weight" value="${lr.weight || ''}" placeholder="10.000" required>
          </label>
          <label>
            Rate (INR) <span class="required-star">*</span>
            <input type="number" min="0" step="0.01" data-field="rate" value="${lr.rate || ''}" placeholder="700" required>
          </label>
          <label>
            Other Charges (INR)
            <input type="number" min="0" step="0.01" data-field="otherCharges" value="${lr.otherCharges || '0'}" placeholder="0">
          </label>
          <div class="lr-line-calc span-2">
            <span>Line Freight: <strong>${currency(f)}</strong></span>
            <span>Line Total: <strong>${currency(lineTotal)}</strong></span>
          </div>
        </div>
      `;

      // Input change listener for this card
      card.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', (e) => {
          const field = e.target.dataset.field;
          lr[field] = e.target.value.trim();

          // Live update the card header summary and line calc
          const currentW = parseFloat(lr.weight) || 0;
          const currentR = parseFloat(lr.rate) || 0;
          const currentOc = parseFloat(lr.otherCharges) || 0;
          const currentF = currentW * currentR;
          const currentTotal = currentF + currentOc;

          const summaryEl = card.querySelector('.lr-card-summary');
          if (summaryEl) {
            summaryEl.textContent = `(${lr.vehicleNumber || 'No vehicle'} | ${currentW > 0 ? currentW.toFixed(3) + ' MT' : '0 MT'})`;
          }
          const calcEl = card.querySelector('.lr-line-calc');
          if (calcEl) {
            calcEl.innerHTML = `
              <span>Line Freight: <strong>${currency(currentF)}</strong></span>
              <span>Line Total: <strong>${currency(currentTotal)}</strong></span>
            `;
          }

          updatePreview();
        });
      });

      // Remove button listener
      const removeBtn = card.querySelector('[data-remove-lr]');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          removeLrAtIndex(idx);
        });
      }

      lrCardsContainer.appendChild(card);
    });

    updatePreview();
  };

  const addLr = () => {
    if (state.lrs.length >= 10) {
      alert('Maximum 10 LR entries allowed per invoice.');
      return;
    }
    const lastLr = state.lrs[state.lrs.length - 1] || {};
    state.lrs.push({
      lrNumber: '',
      lrDate: val('invoiceDate') || new Date().toISOString().slice(0, 10),
      loadingLocation: lastLr.loadingLocation || 'Medchal',
      unloadingLocation: lastLr.unloadingLocation || 'Kalakal',
      goodsDescription: lastLr.goodsDescription || 'Seeds',
      vehicleNumber: '',
      packages: '',
      weight: '',
      rate: lastLr.rate || '700',
      otherCharges: '0',
    });
    renderLrCards();
    // Scroll to the new card
    setTimeout(() => {
      const cards = lrCardsContainer.querySelectorAll('.lr-card');
      if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const removeLrAtIndex = (idx) => {
    if (state.lrs.length <= 1) {
      alert('At least one LR row is required.');
      return;
    }
    state.lrs.splice(idx, 1);
    renderLrCards();
  };

  if (incrementLrBtn) incrementLrBtn.addEventListener('click', addLr);
  if (addLrQuickBtn) addLrQuickBtn.addEventListener('click', addLr);
  if (decrementLrBtn) {
    decrementLrBtn.addEventListener('click', () => {
      if (state.lrs.length > 1) {
        removeLrAtIndex(state.lrs.length - 1);
      }
    });
  }

  // --- Mandatory Field Validation ---
  const validateForm = () => {
    hideStatus();

    // 1. Validate top fields
    const requiredTopFields = [
      { id: 'invoiceNumber', name: 'Invoice Number' },
      { id: 'invoiceDate', name: 'Invoice Date' },
      { id: 'customerName', name: 'Customer / Bill To Name' },
      { id: 'customerGstin', name: 'Customer GSTIN' },
      { id: 'customerAddress', name: 'Billing Address' },
      { id: 'customerState', name: 'State' },
      { id: 'customerStateCode', name: 'State Code' },
    ];

    for (const item of requiredTopFields) {
      const value = val(item.id);
      if (!value) {
        const el = document.getElementById(item.id);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter ${item.name}.`);
        return false;
      }
    }

    // 2. Validate LR rows
    if (!state.lrs || state.lrs.length === 0) {
      showStatus('error', 'Please add at least one LR entry.');
      return false;
    }

    for (let i = 0; i < state.lrs.length; i++) {
      const lr = state.lrs[i];
      const cardEl = lrCardsContainer.querySelector(`.lr-card[data-index="${i}"]`);

      if (!lr.lrNumber) {
        cardEl?.querySelector('[data-field="lrNumber"]')?.focus();
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter LR Number for LR #${i + 1}.`);
        return false;
      }
      if (!lr.lrDate) {
        cardEl?.querySelector('[data-field="lrDate"]')?.focus();
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter LR Date for LR #${i + 1}.`);
        return false;
      }
      if (!lr.vehicleNumber) {
        cardEl?.querySelector('[data-field="vehicleNumber"]')?.focus();
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter Vehicle Number for LR #${i + 1}.`);
        return false;
      }
      const weight = parseFloat(lr.weight);
      if (isNaN(weight) || weight <= 0) {
        cardEl?.querySelector('[data-field="weight"]')?.focus();
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter a valid Weight (> 0) for LR #${i + 1}.`);
        return false;
      }
      const rate = parseFloat(lr.rate);
      if (isNaN(rate) || rate <= 0) {
        cardEl?.querySelector('[data-field="rate"]')?.focus();
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showStatus('error', `Mandatory field missing: Please enter a valid Rate (> 0) for LR #${i + 1}.`);
        return false;
      }
    }

    return true;
  };

  // --- Serialization ---
  const serializeInvoiceData = () => {
    const totals = calculateTotals();
    const lrsWithCalcs = state.lrs.map((lr, idx) => {
      const w = parseFloat(lr.weight) || 0;
      const r = parseFloat(lr.rate) || 0;
      const oc = parseFloat(lr.otherCharges) || 0;
      const f = w * r;
      return {
        sl_no: String(idx + 1),
        lrNumber: lr.lrNumber || '',
        lrDate: lr.lrDate || val('invoiceDate'),
        loadingLocation: lr.loadingLocation || '',
        unloadingLocation: lr.unloadingLocation || '',
        goodsDescription: lr.goodsDescription || '',
        vehicleNumber: lr.vehicleNumber || '',
        packages: lr.packages || '-',
        weight: lr.weight || '0',
        rate: lr.rate || '0',
        freight: f > 0 ? f.toLocaleString('en-IN') : '0',
        otherCharges: lr.otherCharges || '0',
        total: (f + oc).toLocaleString('en-IN'),
      };
    });

    return {
      invoiceNumber: val('invoiceNumber'),
      invoiceDate: val('invoiceDate'),
      customerName: val('customerName'),
      customerGstin: val('customerGstin'),
      customerAddress: val('customerAddress'),
      customerState: val('customerState'),
      customerStateCode: val('customerStateCode'),
      consignor: val('consignor') || val('customerName'),
      consignorAddress: val('consignorAddress') || val('customerAddress'),
      consignorGstin: val('consignorGstin') || val('customerGstin'),
      consignorStateCode: val('consignorStateCode') || val('customerStateCode'),
      consignee: val('consignee') || val('customerName'),
      consigneeAddress: val('consigneeAddress') || val('customerAddress'),
      consigneeStateCode: val('consigneeStateCode') || val('customerStateCode'),
      lrs: lrsWithCalcs,
      otherCharges: val('overallOtherCharges') || '0',
      discount: val('discount') || '0',
      taxMode: val('taxMode') || 'none',
      taxRate: val('taxRate') || '0',
      remarks: val('remarks') || 'NA',
      grandTotal: totals.grandTotal.toLocaleString('en-IN'),
      amountInWords: totals.words,
      updatedAt: new Date().toISOString(),
    };
  };

  // --- Confirmation Modal Flow ---
  const openConfirmModal = () => {
    if (!validateForm()) return;

    const data = serializeInvoiceData();
    const isEdit = state.mode === 'edit';

    confirmModalTitle.textContent = isEdit
      ? `Confirm Resubmit & Update: Invoice #${data.invoiceNumber}`
      : `Confirm Generation: New Invoice #${data.invoiceNumber}`;

    executeConfirmBtn.textContent = isEdit ? 'Resubmit & Update' : 'Yes, Generate Invoice';

    let lrsHtml = `
      <table class="modal-lr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>LR No</th>
            <th>Vehicle</th>
            <th>Weight</th>
            <th>Rate</th>
            <th>Freight</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.lrs.forEach((lr, i) => {
      lrsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td><b>${lr.lrNumber}</b> (${formatDate(lr.lrDate)})</td>
          <td>${lr.vehicleNumber}</td>
          <td>${lr.weight} MT</td>
          <td>₹${lr.rate}</td>
          <td><b>₹${lr.freight}</b></td>
        </tr>
      `;
    });
    lrsHtml += `</tbody></table>`;

    confirmModalBody.innerHTML = `
      <div class="confirm-summary-grid">
        <div><span>Invoice Number</span><strong>#${data.invoiceNumber}</strong></div>
        <div><span>Invoice Date</span><strong>${formatDate(data.invoiceDate)}</strong></div>
        <div style="grid-column:span 2"><span>Billed Customer</span><strong>${data.customerName}</strong></div>
        <div><span>Total LR Count</span><strong>${data.lrs.length} LR(s)</strong></div>
        <div><span>Action</span><strong style="color:${isEdit ? '#b45309' : '#027a48'}">${isEdit ? 'Overwriting Existing Record' : 'Creating New Record'}</strong></div>
      </div>
      <div><strong>LR Details:</strong></div>
      ${lrsHtml}
      <div class="modal-grand-total-box">
        <span>Grand Total Amount</span>
        <strong>₹ ${data.grandTotal}</strong>
        <small>${data.amountInWords}</small>
      </div>
    `;

    confirmModal.style.display = 'flex';
  };

  const closeConfirmModal = () => {
    confirmModal.style.display = 'none';
  };

  if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', closeConfirmModal);
  if (closeConfirmModalBtn) closeConfirmModalBtn.addEventListener('click', closeConfirmModal);

  // --- Client-Side Multi-Row DOCX Generation ---
  const generateDocxClient = async (data, autoDownload = false) => {
    if (!window.JSZip) {
      throw new Error('Word template engine is still loading. Please try again in a few seconds.');
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

    // Extract table rows using regex
    const rowMatches = xml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g);
    if (!rowMatches || rowMatches.length < 13) {
      throw new Error('Unexpected document layout in master template.');
    }

    const row9 = rowMatches[9];
    const row10 = rowMatches[10];

    const generatedRows = [];
    const rawLrs = data.lrs || [];

    rawLrs.forEach((lr, idx) => {
      const w = parseFloat(lr.weight) || 0;
      const r = parseFloat(lr.rate) || 0;
      const oc = parseFloat(lr.otherCharges) || 0;
      const f = w * r;
      const lineTotal = f + oc;

      let rXml = row9;
      rXml = rXml.split('{{sl_no}}').join(String(idx + 1));
      rXml = rXml.split('{{lr_number}}').join(escapeXml(lr.lrNumber || '-'));
      rXml = rXml.split('{{lr_date}}').join(escapeXml(formatDate(lr.lrDate || data.invoiceDate)));
      rXml = rXml.split('{{loading_location}}').join(escapeXml(lr.loadingLocation || '-'));
      rXml = rXml.split('{{unloading_location}}').join(escapeXml(lr.unloadingLocation || '-'));
      rXml = rXml.split('{{goods_description}}').join(escapeXml(lr.goodsDescription || '-'));
      rXml = rXml.split('{{vehicle_number}}').join(escapeXml(lr.vehicleNumber || '-'));
      rXml = rXml.split('{{packages}}').join(escapeXml(lr.packages || '-'));
      rXml = rXml.split('{{weight}}').join(w > 0 ? w.toFixed(3) : '-');
      rXml = rXml.split('{{rate}}').join(r > 0 ? String(r) : '-');
      rXml = rXml.split('{{freight}}').join(Number.isInteger(f) ? f.toLocaleString('en-IN') : f.toFixed(2));
      rXml = rXml.split('{{other_charges}}').join(oc > 0 ? String(oc) : '0');
      rXml = rXml.split('{{total}}').join(Number.isInteger(lineTotal) ? lineTotal.toLocaleString('en-IN') : lineTotal.toFixed(2));

      generatedRows.push(rXml);
    });

    // Pad with blank row10 up to 4 rows
    for (let p = generatedRows.length; p < 4; p++) {
      generatedRows.push(row10);
    }

    // Replace the 4 data rows in master template
    const block4 = rowMatches[9] + rowMatches[10] + rowMatches[11] + rowMatches[12];
    xml = xml.replace(block4, generatedRows.join(''));

    // Replace document-level placeholders
    const [addr1, addr2] = splitAddress(data.customerAddress);
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
      '{{remarks}}': data.remarks || 'NA',
      '{{grand_total}}': data.grandTotal || '0',
      '{{amount_in_words}}': data.amountInWords || 'Zero Rupees Only',
    };

    for (const [ph, valStr] of Object.entries(docMapping)) {
      xml = xml.split(ph).join(escapeXml(valStr));
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

  // --- Client-Side High-Res A4 Landscape PDF Generation ---
  const generatePdfClient = async (data, autoDownload = false) => {
    if (!window.html2canvas || !window.jspdf) {
      throw new Error('PDF generator library is loading. Please wait a moment and try again.');
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

  // --- Execute Invoice Generation / Update ---
  const executeGeneration = async () => {
    closeConfirmModal();
    hideStatus();

    const data = serializeInvoiceData();
    const isEdit = state.mode === 'edit';
    const invNum = data.invoiceNumber;

    if (printButton) {
      printButton.disabled = true;
      printButton.textContent = isEdit ? 'Updating Invoice...' : 'Generating Invoice...';
    }
    showStatus('info', isEdit ? `Updating Invoice #${invNum}...` : `Generating Invoice #${invNum} (Word & PDF)...`);

    try {
      let result = null;

      // 1. Try server API
      try {
        const endpoint = isEdit ? `/api/invoices/${encodeURIComponent(invNum)}` : '/api/invoices';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.ok) {
            result = resJson;
            // Auto download PDF from server
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
        // Fall back to client browser generation for GitHub Pages static host
      }

      // 2. Client-side fallback if server not available
      if (!result) {
        // Prevent accidental duplicates in local storage for new mode
        if (!isEdit && isInvoiceNumberExists(invNum)) {
          throw new Error(`Invoice #${invNum} already exists in records. Please click "New Invoice" to assign the next number.`);
        }

        const docxRes = await generateDocxClient(data, false);
        const pdfRes = await generatePdfClient(data, true); // Automatically download PDF
        result = {
          invoiceNumber: data.invoiceNumber,
          filename: docxRes.filename,
          url: docxRes.url,
          pdfFilename: pdfRes.pdfFilename,
          pdfUrl: pdfRes.pdfUrl,
          message: `Invoice #${invNum} ${isEdit ? 'updated' : 'generated'} successfully.`,
        };
      }

      // Save to localStorage database
      saveToLocalInvoices(data, result);

      state.lastGeneratedResult = result;
      showStatus(
        'success',
        result.message || `Invoice #${invNum} generated successfully.`,
        result.url,
        result.filename,
        result.pdfUrl,
        result.pdfFilename
      );

      if (draftBadge) {
        draftBadge.textContent = isEdit ? `Updated: #${invNum}` : `Generated: #${invNum}`;
        draftBadge.className = 'draft-badge';
      }

      // Refresh invoice history list
      await loadInvoiceHistory();

      // If we were in edit mode, finish edit mode
      if (isEdit) {
        exitEditMode(false);
      } else {
        // Prepare next invoice number for the user's next trip!
        fetchNextInvoiceNumber();
      }
    } catch (error) {
      showStatus('error', error.message || 'Invoice processing failed. Please try again.');
    } finally {
      if (printButton) {
        printButton.disabled = false;
        printButton.textContent = state.mode === 'edit' ? `Resubmit & Update Invoice #${state.editingInvoiceNumber}` : 'Generate Invoice (Word & PDF)';
      }
    }
  };

  if (executeConfirmBtn) executeConfirmBtn.addEventListener('click', executeGeneration);
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      openConfirmModal();
    });
  }

  // --- LocalStorage Database Management ---
  const getLocalInvoices = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };

  const isInvoiceNumberExists = (num) => {
    const list = getLocalInvoices();
    return list.some((inv) => String(inv.invoiceNumber).trim() === String(num).trim());
  };

  const saveToLocalInvoices = (invoiceData, resultMeta) => {
    const list = getLocalInvoices();
    const idx = list.findIndex((inv) => String(inv.invoiceNumber).trim() === String(invoiceData.invoiceNumber).trim());

    const record = {
      ...invoiceData,
      status: 'Generated',
      hasDocx: true,
      hasPdf: true,
      filename: resultMeta?.filename || `Invoice-${invoiceData.invoiceNumber}.docx`,
      pdfFilename: resultMeta?.pdfFilename || `Invoice-${invoiceData.invoiceNumber}.pdf`,
      docxUrl: resultMeta?.url || null,
      pdfUrl: resultMeta?.pdfUrl || null,
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.push(record);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  // --- History Table Rendering & Actions ---
  const loadInvoiceHistory = async () => {
    let serverInvoices = [];
    try {
      const resp = await fetch('/api/invoices');
      if (resp.ok) {
        const resJson = await resp.json();
        if (resJson.ok && Array.isArray(resJson.invoices)) {
          serverInvoices = resJson.invoices;
        }
      }
    } catch (e) {
      // Server offline / static host
    }

    const localList = getLocalInvoices();

    // Merge: server invoices + local invoices
    const map = new Map();
    localList.forEach((inv) => map.set(String(inv.invoiceNumber), inv));
    serverInvoices.forEach((inv) => {
      const existing = map.get(String(inv.invoiceNumber));
      map.set(String(inv.invoiceNumber), { ...(existing || {}), ...inv });
    });

    const combined = Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(String(a.invoiceNumber).replace(/\D/g, '') || '0', 10);
      const numB = parseInt(String(b.invoiceNumber).replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });

    state.invoices = combined;
    renderHistoryTable(combined);
  };

  const renderHistoryTable = (invoicesToRender) => {
    if (!historyTableBody) return;
    const query = (historySearchInput?.value || '').toLowerCase().trim();

    const filtered = invoicesToRender.filter((inv) => {
      if (!query) return true;
      const num = String(inv.invoiceNumber || '').toLowerCase();
      const cust = String(inv.customerName || '').toLowerCase();
      const date = String(inv.invoiceDate || '').toLowerCase();
      const lrsStr = JSON.stringify(inv.lrs || []).toLowerCase();
      return num.includes(query) || cust.includes(query) || date.includes(query) || lrsStr.includes(query);
    });

    if (historyCountBadge) {
      historyCountBadge.textContent = `${filtered.length} records`;
    }

    if (!filtered.length) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="text-align:center;padding:24px;">
            ${query ? 'No matching invoices found.' : 'No invoices saved yet. Generate one above to see it here.'}
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = filtered
      .map((inv) => {
        const lrCount = inv.lrs && Array.isArray(inv.lrs) ? inv.lrs.length : inv.lrCount || 1;
        const totalDisp = inv.grandTotal ? `₹ ${inv.grandTotal}` : '-';
        const isGen = inv.status === 'Generated' || inv.hasDocx || inv.hasPdf;
        const statusClass = isGen ? 'generated' : 'saved';
        const statusText = isGen ? 'Generated' : 'Saved Draft';

        return `
          <tr>
            <td><strong>#${inv.invoiceNumber}</strong></td>
            <td>${formatDate(inv.invoiceDate)}</td>
            <td>${inv.customerName || '-'}</td>
            <td><span style="font-weight:700;color:var(--green);">${lrCount} LR(s)</span></td>
            <td><strong>${totalDisp}</strong></td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td>
              <div class="actions-col">
                <button type="button" class="action-btn view" data-action="view" data-num="${inv.invoiceNumber}">👁️ View</button>
                <button type="button" class="action-btn edit" data-action="edit" data-num="${inv.invoiceNumber}">✏️ Edit</button>
                <button type="button" class="action-btn word" data-action="word" data-num="${inv.invoiceNumber}">📄 Word</button>
                <button type="button" class="action-btn pdf" data-action="pdf" data-num="${inv.invoiceNumber}">📑 PDF</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach row action listeners
    historyTableBody.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const num = btn.dataset.num;
        handleHistoryAction(action, num);
      });
    });
  };

  if (historySearchInput) {
    historySearchInput.addEventListener('input', () => {
      renderHistoryTable(state.invoices);
    });
  }
  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', loadInvoiceHistory);
  }

  // --- View, Edit, Word, PDF Actions ---
  const fetchInvoiceDetails = async (invoiceNumber) => {
    // 1. Try local list
    const local = state.invoices.find((i) => String(i.invoiceNumber) === String(invoiceNumber));
    if (local && local.lrs && local.customerName) {
      return local;
    }

    // 2. Try server API
    try {
      const resp = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {}

    return local || null;
  };

  const handleHistoryAction = async (action, invoiceNumber) => {
    const inv = await fetchInvoiceDetails(invoiceNumber);
    if (!inv) {
      alert(`Invoice #${invoiceNumber} details could not be found.`);
      return;
    }

    if (action === 'view') {
      openViewModal(inv);
    } else if (action === 'edit') {
      enterEditMode(inv);
    } else if (action === 'word') {
      downloadWordForInvoice(inv);
    } else if (action === 'pdf') {
      downloadPdfForInvoice(inv);
    }
  };

  // --- Read-Only View Modal ---
  const openViewModal = (inv) => {
    state.viewingInvoice = inv;
    viewModalTitle.textContent = `Invoice #${inv.invoiceNumber} Summary`;
    viewModalBadge.textContent = inv.status || 'Generated';
    viewModalBadge.className = `status-pill ${inv.status === 'Generated' ? 'generated' : 'saved'}`;

    const lrs = inv.lrs || [
      {
        lrNumber: inv.lrNumber || '-',
        lrDate: inv.lrDate || inv.invoiceDate,
        vehicleNumber: inv.vehicleNumber || '-',
        loadingLocation: inv.loadingLocation || '-',
        unloadingLocation: inv.unloadingLocation || '-',
        goodsDescription: inv.goodsDescription || '-',
        packages: inv.packages || '-',
        weight: inv.weight || '-',
        rate: inv.rate || '-',
        freight: inv.freight || '-',
        otherCharges: inv.otherCharges || '0',
        total: inv.total || inv.grandTotal || '-',
      },
    ];

    let lrsHtml = `
      <table class="modal-lr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>LR No &amp; Date</th>
            <th>Loading / Unloading</th>
            <th>Vehicle No</th>
            <th>Weight</th>
            <th>Rate</th>
            <th>Freight</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    lrs.forEach((lr, i) => {
      lrsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td><b>${lr.lrNumber}</b><br><small>${formatDate(lr.lrDate)}</small></td>
          <td>${lr.loadingLocation || '-'} &rarr; ${lr.unloadingLocation || '-'}</td>
          <td>${lr.vehicleNumber || '-'}</td>
          <td>${lr.weight} MT</td>
          <td>₹${lr.rate}</td>
          <td>₹${lr.freight || '-'}</td>
          <td><b>₹${lr.total || lr.freight || '-'}</b></td>
        </tr>
      `;
    });
    lrsHtml += `</tbody></table>`;

    viewModalBody.innerHTML = `
      <div class="confirm-summary-grid">
        <div><span>Invoice Number</span><strong>#${inv.invoiceNumber}</strong></div>
        <div><span>Invoice Date</span><strong>${formatDate(inv.invoiceDate)}</strong></div>
        <div style="grid-column:span 2"><span>Billed Customer</span><strong>${inv.customerName}</strong></div>
        <div><span>Customer GSTIN</span><strong>${inv.customerGstin || '-'}</strong></div>
        <div><span>State / State Code</span><strong>${inv.customerState || '-'} (${inv.customerStateCode || '-'})</strong></div>
        <div style="grid-column:span 2"><span>Billing Address</span><p style="margin:2px 0;font-size:12px;">${(inv.customerAddress || '-').replace(/\n/g, '<br>')}</p></div>
      </div>
      <div><strong>LR Details (${lrs.length} item(s)):</strong></div>
      ${lrsHtml}
      <div class="modal-grand-total-box">
        <span>Grand Total Amount</span>
        <strong>₹ ${inv.grandTotal || '-'}</strong>
        <small>${inv.amountInWords || ''}</small>
      </div>
    `;

    viewModal.style.display = 'flex';
  };

  const closeViewModal = () => {
    viewModal.style.display = 'none';
    state.viewingInvoice = null;
  };

  if (viewModalCloseBtn) viewModalCloseBtn.addEventListener('click', closeViewModal);
  if (closeViewModalBtn) closeViewModalBtn.addEventListener('click', closeViewModal);

  if (viewModalEditBtn) {
    viewModalEditBtn.addEventListener('click', () => {
      if (state.viewingInvoice) {
        const inv = state.viewingInvoice;
        closeViewModal();
        enterEditMode(inv);
      }
    });
  }

  if (viewModalWordBtn) {
    viewModalWordBtn.addEventListener('click', () => {
      if (state.viewingInvoice) downloadWordForInvoice(state.viewingInvoice);
    });
  }

  if (viewModalPdfBtn) {
    viewModalPdfBtn.addEventListener('click', () => {
      if (state.viewingInvoice) downloadPdfForInvoice(state.viewingInvoice);
    });
  }

  // --- Edit Mode Implementation ---
  const enterEditMode = (inv) => {
    state.mode = 'edit';
    state.editingInvoiceNumber = String(inv.invoiceNumber);

    // Update UI headers & badges
    if (headerModeBadge) {
      headerModeBadge.textContent = `Mode: Editing Invoice #${inv.invoiceNumber}`;
      headerModeBadge.className = 'mode-badge edit-mode';
    }
    if (editorHeading) {
      editorHeading.textContent = `Edit & Resubmit Invoice #${inv.invoiceNumber}`;
    }
    if (draftBadge) {
      draftBadge.textContent = `Editing #${inv.invoiceNumber}`;
      draftBadge.className = 'draft-badge editing';
    }
    if (cancelEditBtnTop) cancelEditBtnTop.style.display = 'inline-block';
    if (cancelEditBtnBottom) cancelEditBtnBottom.style.display = 'inline-block';

    if (printButton) {
      printButton.textContent = `Resubmit & Update Invoice #${inv.invoiceNumber}`;
    }

    // Populate top fields
    setVal('invoiceNumber', inv.invoiceNumber);
    invoiceNumberInput.readOnly = true;
    if (toggleLockInvoiceBtn) {
      toggleLockInvoiceBtn.textContent = '🔒 Locked';
      toggleLockInvoiceBtn.title = 'Invoice number cannot be modified during edit.';
    }

    setVal('invoiceDate', inv.invoiceDate || new Date().toISOString().slice(0, 10));
    setVal('customerName', inv.customerName || '');
    setVal('customerGstin', inv.customerGstin || '');
    setVal('customerAddress', inv.customerAddress || '');
    setVal('customerState', inv.customerState || '');
    setVal('customerStateCode', inv.customerStateCode || '');

    setVal('consignor', inv.consignor || '');
    setVal('consignorAddress', inv.consignorAddress || '');
    setVal('consignorGstin', inv.consignorGstin || '');
    setVal('consignorStateCode', inv.consignorStateCode || '');

    setVal('consignee', inv.consignee || '');
    setVal('consigneeAddress', inv.consigneeAddress || '');
    setVal('consigneeStateCode', inv.consigneeStateCode || '');

    setVal('overallOtherCharges', inv.otherCharges || '0');
    setVal('discount', inv.discount || '0');
    setVal('taxMode', inv.taxMode || 'none');
    setVal('taxRate', inv.taxRate || '0');
    setVal('remarks', inv.remarks || '');

    // Populate LRs
    if (inv.lrs && Array.isArray(inv.lrs) && inv.lrs.length > 0) {
      state.lrs = JSON.parse(JSON.stringify(inv.lrs));
    } else {
      state.lrs = [
        {
          lrNumber: inv.lrNumber || '',
          lrDate: inv.lrDate || inv.invoiceDate || '',
          loadingLocation: inv.loadingLocation || '',
          unloadingLocation: inv.unloadingLocation || '',
          goodsDescription: inv.goodsDescription || '',
          vehicleNumber: inv.vehicleNumber || '',
          packages: inv.packages || '',
          weight: inv.weight || '',
          rate: inv.rate || '',
          otherCharges: inv.otherCharges || '0',
        },
      ];
    }

    renderLrCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showStatus('info', `Loaded Invoice #${inv.invoiceNumber} for editing. Make your changes and click Resubmit & Update.`);
  };

  const exitEditMode = (confirmWithUser = true) => {
    if (confirmWithUser && !confirm('Are you sure you want to exit edit mode? Unsaved changes will be discarded.')) {
      return;
    }

    state.mode = 'new';
    state.editingInvoiceNumber = null;

    if (headerModeBadge) {
      headerModeBadge.textContent = 'Mode: New Invoice';
      headerModeBadge.className = 'mode-badge';
    }
    if (editorHeading) {
      editorHeading.textContent = 'Create a Freight Invoice';
    }
    if (draftBadge) {
      draftBadge.textContent = 'New Draft';
      draftBadge.className = 'draft-badge';
    }
    if (cancelEditBtnTop) cancelEditBtnTop.style.display = 'none';
    if (cancelEditBtnBottom) cancelEditBtnBottom.style.display = 'none';

    if (printButton) {
      printButton.textContent = 'Generate Invoice (Word & PDF)';
    }

    invoiceNumberInput.readOnly = true;
    if (toggleLockInvoiceBtn) {
      toggleLockInvoiceBtn.textContent = '🔒 Auto';
      toggleLockInvoiceBtn.title = 'Auto-assigned next number.';
    }

    fetchNextInvoiceNumber();
    hideStatus();
  };

  if (cancelEditBtnTop) cancelEditBtnTop.addEventListener('click', () => exitEditMode(true));
  if (cancelEditBtnBottom) cancelEditBtnBottom.addEventListener('click', () => exitEditMode(true));

  // --- Direct Download Word / PDF Actions from History ---
  const downloadWordForInvoice = async (inv) => {
    showStatus('info', `Preparing Word file for Invoice #${inv.invoiceNumber}...`);
    try {
      if (inv.docxUrl) {
        downloadFile(inv.docxUrl, inv.filename || `Invoice-${inv.invoiceNumber}.docx`);
        showStatus('success', `Downloaded Word document for Invoice #${inv.invoiceNumber}.`);
        return;
      }
      const res = await generateDocxClient(inv, true);
      showStatus('success', `Downloaded Word document for Invoice #${inv.invoiceNumber}.`, res.url, res.filename);
    } catch (e) {
      showStatus('error', `Failed to download Word file: ${e.message}`);
    }
  };

  const downloadPdfForInvoice = async (inv) => {
    showStatus('info', `Preparing PDF for Invoice #${inv.invoiceNumber}...`);
    try {
      if (inv.pdfUrl) {
        downloadFile(inv.pdfUrl, inv.pdfFilename || `Invoice-${inv.invoiceNumber}.pdf`);
        showStatus('success', `Downloaded PDF for Invoice #${inv.invoiceNumber}.`);
        return;
      }

      // Populate preview sheet temporarily with this invoice's data, then capture PDF
      const currentMode = state.mode;
      const currentLrs = state.lrs;

      // Temporarily set form fields
      setVal('invoiceNumber', inv.invoiceNumber);
      setVal('invoiceDate', inv.invoiceDate);
      setVal('customerName', inv.customerName);
      setVal('customerGstin', inv.customerGstin);
      setVal('customerAddress', inv.customerAddress);
      setVal('customerState', inv.customerState);
      setVal('customerStateCode', inv.customerStateCode);
      setVal('remarks', inv.remarks);
      state.lrs = inv.lrs || [];

      updatePreview();

      const res = await generatePdfClient(inv, true);
      showStatus('success', `Downloaded PDF for Invoice #${inv.invoiceNumber}.`, null, null, res.pdfUrl, res.pdfFilename);

      // Restore form
      if (currentMode === 'edit') {
        enterEditMode(inv);
      } else {
        updatePreview();
      }
    } catch (e) {
      showStatus('error', `Failed to generate PDF: ${e.message}`);
    }
  };

  // --- Action Buttons on Form ---
  if (downloadPdfButton) {
    downloadPdfButton.addEventListener('click', async () => {
      if (!validateForm()) return;
      const data = serializeInvoiceData();
      downloadPdfButton.disabled = true;
      downloadPdfButton.textContent = 'Generating PDF...';
      showStatus('info', `Generating PDF for Invoice #${data.invoiceNumber}...`);

      try {
        let pdfRes = null;
        try {
          const resp = await fetch('/api/invoices', {
            method: state.mode === 'edit' ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (resp.ok) {
            const resJson = await resp.json();
            if (resJson.ok && resJson.pdfUrl) {
              downloadFile(resJson.pdfUrl, resJson.pdfFilename);
              showStatus('success', 'PDF downloaded successfully.', resJson.url, resJson.filename, resJson.pdfUrl, resJson.pdfFilename);
              return;
            }
          }
        } catch (e) {}

        pdfRes = await generatePdfClient(data, true);
        showStatus('success', 'PDF downloaded successfully.', null, null, pdfRes.pdfUrl, pdfRes.pdfFilename);
      } catch (err) {
        showStatus('error', 'PDF download error: ' + err.message);
      } finally {
        downloadPdfButton.disabled = false;
        downloadPdfButton.textContent = 'Download PDF';
      }
    });
  }

  if (downloadDocxButton) {
    downloadDocxButton.addEventListener('click', async () => {
      if (!validateForm()) return;
      const data = serializeInvoiceData();
      downloadDocxButton.disabled = true;
      downloadDocxButton.textContent = 'Generating Word...';
      showStatus('info', `Generating Word file for Invoice #${data.invoiceNumber}...`);

      try {
        try {
          const resp = await fetch('/api/invoices', {
            method: state.mode === 'edit' ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (resp.ok) {
            const resJson = await resp.json();
            if (resJson.ok && resJson.url) {
              downloadFile(resJson.url, resJson.filename);
              showStatus('success', 'Word invoice downloaded successfully.', resJson.url, resJson.filename, resJson.pdfUrl, resJson.pdfFilename);
              return;
            }
          }
        } catch (e) {}

        const docxRes = await generateDocxClient(data, true);
        showStatus('success', 'Word invoice downloaded successfully.', docxRes.url, docxRes.filename);
      } catch (err) {
        showStatus('error', 'Word download error: ' + err.message);
      } finally {
        downloadDocxButton.disabled = false;
        downloadDocxButton.textContent = 'Download Word (.docx)';
      }
    });
  }

  if (printPdfButton) {
    printPdfButton.addEventListener('click', () => {
      if (!validateForm()) return;
      updatePreview();
      window.print();
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const data = serializeInvoiceData();
      saveToLocalInvoices(data, null);
      loadInvoiceHistory();
      showStatus('info', `Draft saved locally for Invoice #${data.invoiceNumber}.`);
    });
  }

  // --- Reset / Clear / Sample Handlers ---
  const resetFormToBlank = () => {
    if (state.mode === 'edit') {
      exitEditMode(false);
    }
    form.reset();
    const today = new Date().toISOString().slice(0, 10);
    setVal('invoiceDate', today);
    setVal('taxMode', 'none');
    state.lrs = [
      {
        lrNumber: '',
        lrDate: today,
        loadingLocation: 'Medchal',
        unloadingLocation: 'Kalakal',
        goodsDescription: 'Seeds',
        vehicleNumber: '',
        packages: '',
        weight: '',
        rate: '700',
        otherCharges: '0',
      },
    ];
    renderLrCards();
    fetchNextInvoiceNumber();
    hideStatus();
  };

  const fillSampleData = () => {
    if (state.mode === 'edit') {
      exitEditMode(false);
    }
    const today = new Date().toISOString().slice(0, 10);
    setVal('invoiceDate', today);
    setVal('customerName', 'GREEN AGREVOLUTION PRIVATE LTD');
    setVal('customerGstin', '09AAECG6456H1ZC');
    setVal('customerAddress', 'B-103/104, Gomti Nagar, Vibhuti Khand Gomti Nagar,\nLucknow - 226010 UTTAR PRADESH');
    setVal('customerState', 'UTTAR PRADESH');
    setVal('customerStateCode', '09/UP');

    setVal('consignor', 'GREEN AGREVOLUTION PRIVATE LTD');
    setVal('consignorAddress', 'C/O GREEN AGREVOLUTION PVT LTD, Medchal');
    setVal('consignorGstin', '36AAECG6456H1ZF');
    setVal('consignorStateCode', '36/TS');

    setVal('consignee', 'GREEN AGREVOLUTION PVT LTD');
    setVal('consigneeAddress', 'C/O Green Agrevolution Pvt Ltd, Medchal');
    setVal('consigneeStateCode', '36/TS');

    setVal('overallOtherCharges', '0');
    setVal('discount', '0');
    setVal('taxMode', 'none');
    setVal('taxRate', '0');
    setVal('remarks', 'NA');

    // 2 Sample LRs to demonstrate multi-LR capability
    state.lrs = [
      {
        lrNumber: '11406',
        lrDate: today,
        loadingLocation: 'Medchal',
        unloadingLocation: 'Kalakal',
        goodsDescription: 'Seeds',
        vehicleNumber: 'AP 28 X 7948',
        packages: '273',
        weight: '10.000',
        rate: '700',
        otherCharges: '0',
      },
      {
        lrNumber: '11407',
        lrDate: today,
        loadingLocation: 'Medchal',
        unloadingLocation: 'Kalakal',
        goodsDescription: 'Seeds',
        vehicleNumber: 'TS 08 UB 4512',
        packages: '320',
        weight: '12.500',
        rate: '700',
        otherCharges: '0',
      },
    ];

    renderLrCards();
    fetchNextInvoiceNumber();
    showStatus('info', 'Sample data loaded with 2 LR numbers. Adjust details as required.');
  };

  if (resetButton) resetButton.addEventListener('click', resetFormToBlank);
  if (clearFormButton) clearFormButton.addEventListener('click', resetFormToBlank);
  if (chipClear) chipClear.addEventListener('click', resetFormToBlank);
  if (fillSampleButton) fillSampleButton.addEventListener('click', fillSampleData);
  if (chipGreenAgro) chipGreenAgro.addEventListener('click', fillSampleData);

  // Top fields change listeners
  const topInputs = form.querySelectorAll('input:not([data-field]), textarea, select');
  topInputs.forEach((el) => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  // --- Initial Startup ---
  const init = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (invoiceDateInput && !invoiceDateInput.value) {
      invoiceDateInput.value = today;
    }
    renderLrCards();
    await loadInvoiceHistory();
    await fetchNextInvoiceNumber();
  };

  init();
})();
