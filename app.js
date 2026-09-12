const form = document.querySelector('#invoiceForm');
const fields = [...form.querySelectorAll('input, textarea, select')];
const currency = value => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const text = (id, value, fallback = '-') => { document.querySelector(`#${id}`).textContent = value || fallback; };
const moneyWords = number => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowThousand = n => n < 20 ? ones[n] : n < 100 ? `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim() : `${ones[Math.floor(n / 100)]} Hundred ${belowThousand(n % 100)}`.trim();
  const integer = Math.floor(Number(number || 0));
  if (integer === 0) return 'Rupees Zero Only';
  const parts = [];
  const crore = Math.floor(integer / 10000000); const lakh = Math.floor((integer % 10000000) / 100000); const thousand = Math.floor((integer % 100000) / 1000); const rest = integer % 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`); if (lakh) parts.push(`${belowThousand(lakh)} Lakh`); if (thousand) parts.push(`${belowThousand(thousand)} Thousand`); if (rest) parts.push(belowThousand(rest));
  return `Rupees ${parts.join(' ')} Only`;
};
const value = id => document.querySelector(`#${id}`).value.trim();
const calculate = () => {
  const freight = Number(value('weight')) * Number(value('rate'));
  const other = Number(value('otherCharges')) || 0;
  const discount = Number(value('discount')) || 0;
  const taxable = Math.max(0, freight + other - discount);
  const taxRate = Number(value('taxRate')) || 0;
  const tax = value('taxMode') === 'none' ? 0 : taxable * taxRate / 100;
  const total = taxable + tax;
  return { freight, other, discount, taxable, tax, total };
};
const update = () => {
  const totals = calculate();
  text('previewInvoiceNumber', value('invoiceNumber'));
  const invoiceDate = value('invoiceDate');
  text('previewInvoiceDate', invoiceDate ? new Date(`${invoiceDate}T00:00:00`).toLocaleDateString('en-GB').replaceAll('/', '-') : '-');
  const lrDate = value('lrDate') || invoiceDate;
  text('previewLrNumber', value('lrNumber')); text('previewLrDate', lrDate ? new Date(`${lrDate}T00:00:00`).toLocaleDateString('en-GB').replaceAll('/', '-') : '-');
  text('previewCustomerName', value('customerName')); text('previewCustomerAddress', value('customerAddress'));
  text('previewCustomerGstin', value('customerGstin')); text('previewCustomerState', value('customerState')); text('previewCustomerStateCode', value('customerStateCode')); text('previewConsignor', value('consignor')); text('previewConsignee', value('consignee')); text('previewLoading', value('loadingLocation')); text('previewUnloading', value('unloadingLocation')); text('previewVehicle', value('vehicleNumber')); text('previewPackages', value('packages')); text('previewDescription', value('goodsDescription'));
  text('previewWeight', Number(value('weight') || 0).toFixed(3)); text('previewRate', Number(value('rate') || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })); text('previewFreight', totals.freight.toLocaleString('en-IN', { maximumFractionDigits: 2 })); text('previewOtherCharges', totals.other.toLocaleString('en-IN', { maximumFractionDigits: 2 })); text('previewTotal', totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  text('previewGrandTotal', `₹ ${totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`); text('previewWords', moneyWords(totals.total).replace(/^Rupees (.*) Only$/, '$1 Rupees')); text('previewRemarks', value('remarks') || 'NA');
  text('freightLive', currency(totals.freight)); text('taxableLive', currency(totals.taxable)); text('totalLive', currency(totals.total));
};
const serialize = () => Object.fromEntries(fields.map(field => [field.id, field.value]));
const restore = data => fields.forEach(field => { if (data[field.id] !== undefined) field.value = data[field.id]; });
const historyKey = 'transbill-invoices';
const renderHistory = () => {
  const records = JSON.parse(localStorage.getItem(historyKey) || '[]'); const list = document.querySelector('#historyList'); document.querySelector('#historyCount').textContent = `${records.length} saved`;
  list.innerHTML = records.length ? records.slice().reverse().map((record, index) => `<div class="history-item"><div><strong>Invoice ${record.invoiceNumber || '-'}</strong><small>${record.customerName || 'No customer'} | ${record.date || 'No date'}</small></div><button type="button" data-history="${records.length - 1 - index}">Load</button></div>`).join('') : '<p class="empty-state">Saved drafts will appear here.</p>';
  list.querySelectorAll('[data-history]').forEach(button => button.addEventListener('click', () => { restore(records[Number(button.dataset.history)]); update(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
};
const setToday = () => { const invoiceDate = document.querySelector('#invoiceDate'); if (!invoiceDate.value) invoiceDate.value = new Date().toISOString().slice(0, 10); };
const startBlankInvoice = () => {
  fields.forEach(field => { field.value = ''; });
  document.querySelector('#invoiceDate').value = new Date().toISOString().slice(0, 10);
  document.querySelector('#lrDate').value = document.querySelector('#invoiceDate').value;
  document.querySelector('#taxMode').value = 'none';
  update();
  document.querySelector('#draftStatus').textContent = 'New invoice';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
fields.forEach(field => field.addEventListener('input', update));
document.querySelector('#saveButton').addEventListener('click', () => { const records = JSON.parse(localStorage.getItem(historyKey) || '[]'); records.push({ ...serialize(), date: value('invoiceDate') }); localStorage.setItem(historyKey, JSON.stringify(records.slice(-20))); document.querySelector('#draftStatus').textContent = 'Saved'; renderHistory(); });
document.querySelector('#printButton').addEventListener('click', async () => {
  const requiredFields = ['invoiceNumber', 'invoiceDate', 'customerName', 'weight', 'rate'];
  const missingField = requiredFields.find(fieldId => !value(fieldId));
  if (missingField) { document.querySelector(`#${missingField}`).focus(); alert('Please complete the required invoice fields before submitting.'); return; }
  const confirmed = window.confirm(`Are you sure you want to submit invoice ${value('invoiceNumber')}?\n\nPlease check the customer, trip, and total details before continuing.`);
  if (!confirmed) return;
  update();
  const pdfWindow = window.open('', '_blank');
  const button = document.querySelector('#printButton');
  button.disabled = true;
  button.textContent = 'Generating PDF...';
  document.querySelector('#draftStatus').textContent = 'Generating';
  try {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      const response = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serialize()) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'The server could not generate the PDF.');
      const generatedUrl = new URL(result.url, window.location.href).href;
      if (pdfWindow) pdfWindow.location.href = generatedUrl;
      else window.location.href = generatedUrl;
      document.querySelector('#draftStatus').textContent = `Saved: ${result.filename}`;
      return;
    }
    if (!window.html2canvas || !window.jspdf) throw new Error('PDF libraries could not be loaded. Check your internet connection and reload the app.');
    const canvas = await window.html2canvas(document.querySelector('#invoiceSheet'), { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const imageHeight = canvas.height * pageWidth / canvas.width;
    const renderHeight = Math.min(imageHeight, pageHeight);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, pageWidth, renderHeight, undefined, 'FAST');
    const blobUrl = pdf.output('bloburl');
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `Invoice-${value('invoiceNumber')}.pdf`;
    downloadLink.click();
    if (pdfWindow) {
      pdfWindow.location.href = blobUrl;
    } else {
      window.location.href = blobUrl;
    }
    document.querySelector('#draftStatus').textContent = 'PDF ready';
  } catch (error) {
    if (pdfWindow) pdfWindow.close();
    document.querySelector('#draftStatus').textContent = 'PDF failed';
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Generate invoice PDF';
  }
});
document.querySelector('#resetButton').addEventListener('click', startBlankInvoice);
document.querySelector('#clearFormButton').addEventListener('click', startBlankInvoice);
setToday(); update(); renderHistory();