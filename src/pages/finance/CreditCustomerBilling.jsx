import { useEffect, useMemo, useRef, useState } from 'react';
import { api, unwrap } from '../../services/api';

const fieldStyle = { border: '1px solid #dbe2ec', borderRadius: 6, padding: '9px 11px', color: '#334155', background: '#fff', minHeight: 38 };
const buttonStyle = { ...fieldStyle, cursor: 'pointer', fontWeight: 600 };
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const today = localDate;
const currentPeriod = () => localDate().slice(0, 7);
const customerLabel = customer => customer.displayName || customer.companyName || customer.id;
const money = (value, currency) => value == null ? 'Unavailable' : `${currency || ''} ${String(value)}`.trim();

function Table({ headers, children, empty }) {
  return <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr>{headers.map(name => <th key={name} style={{ textAlign: 'left', background: '#f8fafc', color: '#475569', padding: '11px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{name}</th>)}</tr></thead>
      <tbody>{children || <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>{empty}</td></tr>}</tbody>
    </table>
  </div>;
}

export default function CreditCustomerBilling() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [period, setPeriod] = useState(currentPeriod);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [eligible, setEligible] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const adjustmentInFlight = useRef(false);
  const adjustmentKey = useRef(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCustomer = useMemo(() => customers.find(customer => customer.id === customerId), [customers, customerId]);

  async function loadCustomers() {
    setLoading(true);
    setError('');
    try {
      const result = unwrap(await api.creditBillingCustomers());
      const rows = result.customers || [];
      setCustomers(rows);
      setCustomerId(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id || '');
    } catch (failure) {
      setError(failure.message || 'Credit customers could not be loaded.');
    } finally { setLoading(false); }
  }

  async function loadBilling(customer = customerId, month = period) {
    if (!customer || !month) { setEligible(null); setInvoices([]); return; }
    setLoading(true);
    setError('');
    try {
      const [eligibleResult, invoiceResult] = await Promise.all([
        api.creditBillingEligibleShipments({ customerId: customer, period: month }),
        api.creditInvoices({ customerId: customer }),
      ]);
      const eligibility = unwrap(eligibleResult);
      const history = unwrap(invoiceResult);
      setEligible(eligibility);
      setInvoices(history.invoices || []);
    } catch (failure) {
      setError(failure.message || 'Billing information could not be loaded.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { if (customerId) loadBilling(customerId, period); }, [customerId, period]);

  async function generateInvoice(event) {
    event.preventDefault();
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const result = unwrap(await api.generateCreditInvoice({
        customerId, period, invoiceNumber: invoiceNumber.trim(), invoiceDate,
        ...(dueDate ? { dueDate } : {}),
      }));
      setNotice(`Invoice ${result.invoice?.invoiceNumber || invoiceNumber} generated from saved shipment pricing snapshots.`);
      setInvoiceNumber('');
      await loadBilling(customerId, period);
    } catch (failure) {
      setError(failure.message || 'Invoice could not be generated.');
    } finally { setGenerating(false); }
  }

  async function openInvoice(invoice) {
    setError(''); setAdjustmentError(''); adjustmentKey.current = null;
    try {
      const result = unwrap(await api.creditInvoice(invoice.id));
      setSelectedInvoice(result.invoice || null);
    } catch (failure) { setError(failure.message || 'Invoice details could not be loaded.'); }
  }

  async function addAdjustment(event) {
    event.preventDefault();
    if (adjustmentInFlight.current || !selectedInvoice) return;
    adjustmentInFlight.current = true;
    setAdjusting(true); setAdjustmentError('');
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    adjustmentKey.current ||= crypto.randomUUID();
    try {
      const result = unwrap(await api.adjustCreditInvoice(selectedInvoice.id, { ...fields, idempotencyKey: adjustmentKey.current }));
      setSelectedInvoice(result.invoice);
      adjustmentKey.current = null;
      form.reset();
      await loadBilling();
    } catch (failure) { setAdjustmentError(failure.message || 'Adjustment could not be saved.'); }
    finally { adjustmentInFlight.current = false; setAdjusting(false); }
  }

  const eligibleRows = eligible?.eligibleShipments || [];
  const blockedRows = eligible?.blockedShipments || [];
  const blockers = eligible?.blockers || [];
  const canGenerate = customerId && eligibleRows.length > 0 && blockers.length === 0 && blockedRows.length === 0 && invoiceNumber.trim() && !generating;

  return <section aria-label="Credit customer billing" style={{ color: '#172b4d' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
      <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>Credit customer
        <select aria-label="Credit customer" value={customerId} onChange={event => setCustomerId(event.target.value)} style={fieldStyle}>
          <option value="">Select a customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customerLabel(customer)}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>Billing period
        <input aria-label="Billing period" type="month" value={period} onChange={event => setPeriod(event.target.value)} style={fieldStyle} />
      </label>
    </div>

    {!loading && selectedCustomer && <div style={{ padding: 14, marginBottom: 18, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13 }}>
      <strong>{customerLabel(selectedCustomer)}</strong><span style={{ color: '#64748b' }}> · CREDIT customer · {eligible?.configuration?.billingCycle || 'Monthly period selected'}</span>
      {eligible?.configuration?.status === 'CONFIGURATION_REQUIRED' && <p role="status" style={{ margin: '8px 0 0', color: '#9a3412' }}>Billing configuration is incomplete. Invoice generation remains blocked until required business rules are configured.</p>}
    </div>}

    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {notice && <p role="status" style={{ color: '#166534' }}>{notice}</p>}
    {loading && <p role="status">Loading billing data…</p>}
    {!loading && !customers.length && <p>No Credit customers are available in this account.</p>}

    {!loading && customerId && <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0 10px' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Eligible shipments <small style={{ color: '#64748b', fontWeight: 400 }}>({eligibleRows.length})</small></h3>
        <span style={{ fontSize: 12, color: '#64748b' }}>Source: immutable booking-time customer pricing snapshots</span>
      </div>
      {eligible?.statement && <details style={{ marginBottom: 16 }}>
        <summary>Customer shipment statement</summary>
        <p>{eligible.period?.start?.slice(0, 10)} to {eligible.period?.endExclusive?.slice(0, 10)} (end date excluded)</p>
        <Table headers={['Order reference', 'AWB', 'Shipment date', 'Shipment status', 'Billing status', 'Invoice', 'Amount']} empty={eligible.statement.dateBasis ? 'No booked shipments in this billing period.' : 'Set the billing date basis to load a statement.'}>
          {eligible.statement.entries?.length > 0 ? eligible.statement.entries.map(row => <tr key={row.shipmentId}>
            {[row.reference, row.waybill, row.shipmentDate?.slice(0, 10), row.shipmentStatus, String(row.billingStatus).replaceAll('_', ' '), row.invoiceNumber, (row.sample ? 'SAMPLE ' : '') + money(row.amount, row.currency)].map((value, index) => <td key={index} style={{ padding: 10 }}>{value || 'Unavailable'}</td>)}
          </tr>) : null}
        </Table>
      </details>}
      <Table headers={['Order reference', 'AWB', 'Shipment date', 'Mode', 'Selling amount', 'Pricing status']} empty={eligible ? 'No eligible shipments for this customer and period.' : 'Select a billing period.'}>
        {eligibleRows.map(row => <tr key={row.shipmentId}>
          {[row.reference || '—', row.waybill || '—', row.shipmentDate || '—', row.mode || '—', money(row.amount, row.currency), row.pricingStatus || '—'].map((value, index) => <td key={index} style={{ padding: '11px 12px', borderBottom: '1px solid #f1f5f9' }}>{value}</td>)}
        </tr>)}
      </Table>

      {!!blockers.length && <div role="status" style={{ marginTop: 12, padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, color: '#9a3412' }}>
        <strong>Invoice generation blocked</strong><ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{blockers.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </div>}
      {!!blockedRows.length && <details style={{ marginTop: 12 }}><summary>{blockedRows.length} booked shipment(s) excluded or requiring configuration</summary>
        <Table headers={['Order reference', 'AWB', 'Reason']} empty="No excluded shipments.">
          {blockedRows.map(row => <tr key={row.shipmentId}><td style={{ padding: 10 }}>{row.reference || '—'}</td><td style={{ padding: 10 }}>{row.waybill || '—'}</td><td style={{ padding: 10 }}>{(row.blockers || []).join('; ')}</td></tr>)}
        </Table>
      </details>}

      <form onSubmit={generateInvoice} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 10, margin: '18px 0 28px', padding: 14, border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Invoice number (enter per approved numbering policy)
          <input aria-label="Invoice number" required maxLength={100} value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Invoice date
          <input aria-label="Invoice date" required type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Due date (optional; no default assumed)
          <input aria-label="Due date" type="date" min={invoiceDate} value={dueDate} onChange={event => setDueDate(event.target.value)} style={fieldStyle} />
        </label>
        <button type="submit" disabled={!canGenerate} style={{ ...buttonStyle, opacity: canGenerate ? 1 : .55 }}> {generating ? 'Generating…' : 'Generate monthly invoice'}</button>
      </form>

      <h3 style={{ fontSize: 16 }}>Billing history · {customerLabel(selectedCustomer || {})}</h3>
      <Table headers={['Invoice number', 'Period', 'Invoice date', 'Due date', 'Status', 'Total', 'Details']} empty="No invoices have been generated for this customer and period.">
        {invoices.map(invoice => <tr key={invoice.id}>
          <td style={{ padding: 10 }}>{invoice.invoiceNumber}</td><td style={{ padding: 10 }}>{invoice.period?.key || '—'}</td><td style={{ padding: 10 }}>{invoice.invoiceDate?.slice(0, 10) || '—'}</td><td style={{ padding: 10 }}>{invoice.dueDate?.slice(0, 10) || 'Not configured'}</td><td style={{ padding: 10 }}>{invoice.status}</td><td style={{ padding: 10 }}>{money(invoice.adjustedTotalAmount ?? invoice.totalAmount, invoice.currency)}</td><td style={{ padding: 10 }}><button type="button" onClick={() => openInvoice(invoice)} style={{ ...buttonStyle, padding: '6px 9px' }}>View details</button></td>
        </tr>)}
      </Table>
    </>}

    {selectedInvoice && <div role="dialog" aria-modal="true" aria-labelledby="invoice-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0f172a66', display: 'grid', placeItems: 'center', padding: 16 }}>
      <article style={{ background: '#fff', width: 'min(900px,100%)', maxHeight: '90vh', overflow: 'auto', padding: 22, borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 id="invoice-title" style={{ margin: 0 }}>Invoice {selectedInvoice.invoiceNumber}</h2><p style={{ color: '#64748b' }}>{selectedInvoice.customerSnapshot?.displayName || selectedInvoice.customerSnapshot?.companyName} · {selectedInvoice.period?.key}</p></div><button type="button" aria-label="Close invoice details" disabled={adjusting} onClick={() => setSelectedInvoice(null)} style={buttonStyle}>Close</button></div>
        <p>Status: <strong>{selectedInvoice.status}</strong> · Invoice date: {selectedInvoice.invoiceDate?.slice(0, 10)} · Due: {selectedInvoice.dueDate?.slice(0, 10) || 'Not configured'}</p>
        <Table headers={['Order reference', 'AWB', 'Mode', 'Charge breakdown snapshot', 'Tax', 'Line total']} empty="No shipment lines.">
          {(selectedInvoice.lineItems || []).map(line => <tr key={line.shipmentId}><td style={{ padding: 10 }}>{line.reference || '—'}</td><td style={{ padding: 10 }}>{line.waybill || '—'}</td><td style={{ padding: 10 }}>{line.mode || '—'}</td><td style={{ padding: 10 }}><pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, margin: 0 }}>{JSON.stringify(line.chargeBreakdown, null, 2)}</pre></td><td style={{ padding: 10 }}>{money(line.taxAmount, line.currency)}</td><td style={{ padding: 10 }}>{money(line.totalAmount, line.currency)}</td></tr>)}
        </Table>
        <p style={{ textAlign: 'right', fontWeight: 700 }}>Invoice total: {money(selectedInvoice.totalAmount, selectedInvoice.currency)}</p>
        {selectedInvoice.adjustedTotalAmount != null && <p>Adjusted total {money(selectedInvoice.adjustedTotalAmount, selectedInvoice.currency)} ? Outstanding {money(selectedInvoice.outstandingAmount, selectedInvoice.currency)}</p>}
        {(selectedInvoice.adjustments || []).length > 0 && <ul>{selectedInvoice.adjustments.map(entry => <li key={entry.idempotencyKey}>{entry.kind} {money(entry.amount, selectedInvoice.currency)} ? {entry.reason}</li>)}</ul>}
        <form onSubmit={addAdjustment}>
          <fieldset disabled={adjusting} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <legend>Invoice adjustment</legend>
            <label>Type <select name="kind"><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></label>
            <label>Amount <input name="amount" type="number" step="any" min="0.01" required /></label>
            <label>Reason <input name="reason" maxLength={160} required /></label>
            <button type="submit" style={buttonStyle}>{adjusting ? 'Saving?' : 'Record adjustment'}</button>
          </fieldset>
          {adjustmentError && <p role="alert">{adjustmentError}</p>}
        </form>
        <p style={{ fontSize: 12, color: '#64748b' }}>Shipment charges are copied from the historical booking snapshot. No current Rate Master values are used.</p>
      </article>
    </div>}
  </section>;
}
