import { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../../services/api';

const input = { border: '1px solid #dbe2ec', borderRadius: 6, padding: '9px 11px', background: '#fff', minHeight: 38, color: '#334155' };
const button = { ...input, cursor: 'pointer', fontWeight: 600 };
const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const label = customer => customer.displayName || customer.companyName || customer.id;
const money = (amount, currency) => amount == null ? 'Unavailable' : `${currency || ''} ${amount}`.trim();
const cell = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };

function GridTable({ columns, children, empty }) {
  return <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead><tr>{columns.map(item => <th key={item} style={{ textAlign: 'left', padding: 11, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{item}</th>)}</tr></thead>
    <tbody>{children || <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 22, color: '#64748b' }}>{empty}</td></tr>}</tbody>
  </table></div>;
}

function newKey() {
  return globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PaymentManagement() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [outstanding, setOutstanding] = useState(null);
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(localDate);
  const [reference, setReference] = useState('');
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const selectedCustomer = useMemo(() => customers.find(row => row.id === customerId), [customers, customerId]);
  const allocatedTotal = useMemo(() => Object.values(allocations).filter(value => value !== '').reduce((sum, value) => sum + (Number(value) || 0), 0), [allocations]);

  async function loadCustomers() {
    setLoading(true); setError('');
    try {
      const response = unwrap(await api.creditBillingCustomers());
      const rows = response.customers || [];
      setCustomers(rows);
      setCustomerId(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id || '');
    } catch (failure) { setError(failure.message || 'Credit customers could not be loaded.'); }
    finally { setLoading(false); }
  }

  async function loadCustomerPayments(id = customerId) {
    if (!id) { setInvoices([]); setPayments([]); setOutstanding(null); return; }
    setLoading(true); setError('');
    try {
      const [invoiceResult, paymentResult, balanceResult] = await Promise.all([
        api.paymentInvoices({ customerId: id }), api.customerPayments({ customerId: id }), api.customerOutstanding(id),
      ]);
      setInvoices(unwrap(invoiceResult).invoices || []);
      setPayments(unwrap(paymentResult).payments || []);
      setOutstanding(unwrap(balanceResult));
      setAllocations({});
    } catch (failure) { setError(failure.message || 'Payment history could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => { if (customerId) loadCustomerPayments(customerId); }, [customerId]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const requestKey = idempotencyKey || newKey();
    setIdempotencyKey(requestKey);
    try {
      const selected = Object.entries(allocations).filter(([, value]) => value !== '').map(([invoiceId, value]) => ({ invoiceId, amount: value }));
      const response = unwrap(await api.recordCustomerPayment({
        customerId, amount, currency: selected[0] ? invoices.find(row => row.id === selected[0].invoiceId)?.currency : undefined,
        receivedAt, reference: reference.trim(), idempotencyKey: requestKey, allocations: selected,
      }));
      setNotice(`Payment recorded. ${selected.length} invoice allocation(s) saved.`);
      setIdempotencyKey(''); setAmount(''); setReference(''); setAllocations({});
      await loadCustomerPayments(customerId);
      if (response.payment) setSelectedPayment(response.payment);
    } catch (failure) { setError(failure.message || 'Payment could not be recorded. Reuse the same request by retrying safely.'); }
    finally { setSaving(false); }
  }

  async function openPayment(row) {
    setError('');
    try { const result = unwrap(await api.customerPayment(row.id)); setSelectedPayment(result.payment || null); }
    catch (failure) { setError(failure.message || 'Payment details could not be loaded.'); }
  }

  function allocationChange(invoiceId, value) {
    setAllocations(current => ({ ...current, [invoiceId]: value }));
    if (!idempotencyKey) return;
  }

  const chosenCount = Object.values(allocations).filter(value => value !== '').length;
  const totalMatches = Number.isFinite(Number(amount)) && Math.abs(allocatedTotal - Number(amount)) < 1e-9;
  const submitEnabled = customerId && amount && Number(amount) > 0 && chosenCount > 0 && totalMatches && !saving;

  return <section aria-label="Payment management" style={{ color: '#172b4d' }}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 18 }}>
      <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>Credit customer
        <select aria-label="Payment customer" value={customerId} onChange={event => { setCustomerId(event.target.value); setIdempotencyKey(''); setAmount(''); setAllocations({}); }} style={input}>
          <option value="">Select a customer</option>{customers.map(row => <option key={row.id} value={row.id}>{label(row)}</option>)}
        </select>
      </label>
      {outstanding && <div style={{ padding: '9px 13px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
        <small style={{ color: '#64748b' }}>Outstanding balance</small><div style={{ fontSize: 18, fontWeight: 700 }}>{outstanding.mixedCurrencies ? 'Multiple currencies' : money(outstanding.totalOutstanding, outstanding.currency)}</div>
      </div>}
    </div>

    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {notice && <p role="status" style={{ color: '#166534' }}>{notice}</p>}
    {loading && <p role="status">Loading payment records…</p>}
    {!loading && customers.length === 0 && <p>No Credit customers are available in this account.</p>}

    {!!customerId && !loading && <>
      <h3 style={{ fontSize: 16 }}>Open invoices and allocation</h3>
      <p style={{ color: '#64748b', fontSize: 12 }}>Enter each allocation amount. A payment must be fully allocated to one or more invoices in the same currency.</p>
      <GridTable columns={['Invoice', 'Invoice date', 'Due date', 'Status', 'Invoice total', 'Paid', 'Outstanding', 'Allocate']} empty="No outstanding invoices for this customer.">
        {invoices.filter(row => row.status !== 'PAID').map(row => <tr key={row.id}>
          <td style={cell}>{row.invoiceNumber}</td><td style={cell}>{row.invoiceDate?.slice(0, 10) || '—'}</td><td style={cell}>{row.dueDate?.slice(0, 10) || 'Not configured'}</td><td style={cell}>{row.status}</td>
          <td style={cell}>{money(row.totalAmount, row.currency)}</td><td style={cell}>{money(row.paidAmount, row.currency)}</td><td style={cell}>{money(row.outstandingAmount, row.currency)}</td>
          <td style={cell}><input aria-label={`Allocate to ${row.invoiceNumber}`} type="number" min="0" step="any" max={row.outstandingAmount} value={allocations[row.id] ?? ''} onChange={event => allocationChange(row.id, event.target.value)} placeholder="0" style={{ ...input, width: 120 }} /></td>
        </tr>)}
      </GridTable>

      <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', margin: '18px 0 28px', padding: 14, border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Payment amount<input aria-label="Payment amount" type="number" min="0.01" step="any" required value={amount} onChange={event => { setAmount(event.target.value); setIdempotencyKey(''); }} style={input} /></label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Received date<input aria-label="Received date" type="date" required value={receivedAt} onChange={event => { setReceivedAt(event.target.value); setIdempotencyKey(''); }} style={input} /></label>
        <label style={{ display: 'grid', gap: 5, fontSize: 12 }}>Reference (optional)<input aria-label="Payment reference" maxLength={160} value={reference} onChange={event => { setReference(event.target.value); setIdempotencyKey(''); }} style={input} /></label>
        <span aria-live="polite" style={{ color: totalMatches ? '#166534' : '#9a3412', fontSize: 12 }}>Allocated: {allocatedTotal.toFixed(2)} · Payment: {amount || '0'}</span>
        <button type="submit" disabled={!submitEnabled} style={{ ...button, opacity: submitEnabled ? 1 : .55 }}>{saving ? 'Recording…' : 'Record payment'}</button>
      </form>

      <h3 style={{ fontSize: 16 }}>Customer payment history · {label(selectedCustomer || {})}</h3>
      <GridTable columns={['Received', 'Amount', 'Reference', 'Allocations', 'Details']} empty="No payments recorded for this customer.">
        {payments.map(row => <tr key={row.id}>
          <td style={cell}>{row.receivedAt?.slice(0, 10)}</td><td style={cell}>{money(row.amount, row.currency)}</td><td style={cell}>{row.reference || '—'}</td><td style={cell}>{(row.allocations || []).map(item => `${item.invoiceNumber}: ${money(item.amount, item.currency)}`).join(' · ')}</td><td style={cell}><button type="button" style={{ ...button, padding: '5px 9px' }} onClick={() => openPayment(row)}>Receipt details</button></td>
        </tr>)}
      </GridTable>
    </>}

    {selectedPayment && <div role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0f172a66', display: 'grid', placeItems: 'center', padding: 16 }}>
      <article style={{ background: '#fff', width: 'min(760px,100%)', maxHeight: '90vh', overflow: 'auto', padding: 22, borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 id="payment-detail-title" style={{ margin: 0 }}>Payment details</h2><p style={{ color: '#64748b' }}>{selectedPayment.customerSnapshot?.displayName || selectedPayment.customerSnapshot?.companyName}</p></div><button type="button" aria-label="Close payment details" style={button} onClick={() => setSelectedPayment(null)}>Close</button></div>
        <p><strong>Amount:</strong> {money(selectedPayment.amount, selectedPayment.currency)} · <strong>Received:</strong> {selectedPayment.receivedAt?.slice(0, 10)}</p>
        {selectedPayment.reference && <p><strong>Reference:</strong> {selectedPayment.reference}</p>}
        <GridTable columns={['Invoice', 'Allocation amount']} empty="No invoice allocations.">{(selectedPayment.allocations || []).map(item => <tr key={item.invoiceId}><td style={cell}>{item.invoiceNumber}</td><td style={cell}>{money(item.amount, item.currency)}</td></tr>)}</GridTable>
        <p style={{ fontSize: 12, color: '#64748b' }}>This is a payment record detail view; no payment method or formal receipt format is assumed.</p>
        <button type="button" onClick={() => window.print()} style={button}>Print payment details</button>
      </article>
    </div>}
  </section>;
}
