import { useCallback, useEffect, useState } from 'react';
import { api, unwrap } from '../../services/api';

const input = { border: '1px solid #dbe2ec', borderRadius: 6, padding: '9px 11px', background: '#fff', minHeight: 38, color: '#334155' };
const button = { ...input, cursor: 'pointer', fontWeight: 600 };
const cell = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };
const money = (value, currency) => value == null ? 'Unavailable' : `${currency || ''} ${value}`.trim();
const estimatedMoney = cost => (cost?.source === 'LOCAL_MOCK_ONLY' ? 'SAMPLE ' : '') + money(cost?.amount, cost?.currency);
const statusLabel = value => ({ UNAVAILABLE: 'Unavailable', PENDING: 'Pending final cost', CONFIRMED: 'Confirmed', DISCREPANT: 'Discrepant' }[value] || value);

function Table({ columns, children, empty }) {
  return <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead><tr>{columns.map(name => <th key={name} style={{ textAlign: 'left', padding: 11, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{name}</th>)}</tr></thead>
    <tbody>{children || <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 22, color: '#64748b' }}>{empty}</td></tr>}</tbody>
  </table></div>;
}

function Breakdown({ value }) {
  const fields = [['Base freight', 'baseFreight'], ['Fuel surcharge', 'fuelSurcharge'], ['COD charges', 'codCharges'], ['Other charges', 'otherCharges'], ['Taxes and GST', 'taxesAndGst'], ['Total', 'total']];
  if (!value) return <p style={{ color: '#64748b' }}>Charge breakdown was not supplied.</p>;
  return <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>{fields.filter(([, key]) => value[key] != null).map(([label, key]) => <div key={key}><dt style={{ color: '#64748b', fontSize: 12 }}>{label}</dt><dd style={{ margin: '4px 0 0', fontWeight: key === 'total' ? 700 : 500 }}>{value[key]}</dd></div>)}</dl>;
}

export default function PartnerCostManagement() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ partnerCode: '', from: '', to: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ amount: '', currency: 'INR', sourceReference: '', invoiceDate: '', chargeBreakdown: '', taxBasis: '', gstRecoverability: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = unwrap(await api.partnerCosts(filters)); setRows(result.costs || []); }
    catch (failure) { setError(failure.message || 'Partner costs could not be loaded.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  const open = async row => {
    setError(''); setNotice('');
    try { const result = unwrap(await api.partnerCost(row.shipmentId)); setSelected(result.cost || null); }
    catch (failure) { setError(failure.message || 'Shipment cost details could not be loaded.'); }
  };
  const recordFinal = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const body = { ...form };
      if (body.gstRecoverability === '') delete body.gstRecoverability;
      if (!body.invoiceDate) delete body.invoiceDate;
      if (body.chargeBreakdown) body.chargeBreakdown = JSON.parse(body.chargeBreakdown);
      else delete body.chargeBreakdown;
      if (body.taxBasis) body.taxBasis = JSON.parse(body.taxBasis);
      else delete body.taxBasis;
      const result = unwrap(await api.recordFinalPartnerCost(selected.shipmentId, body));
      setSelected(result.cost); setNotice('Final cost recorded and compared with the preserved estimate.');
      setForm({ amount: '', currency: 'INR', sourceReference: '', invoiceDate: '', chargeBreakdown: '', taxBasis: '', gstRecoverability: '', notes: '' });
      await load();
    } catch (failure) { setError(failure.message || 'Final partner cost could not be recorded. Check JSON fields.'); }
    finally { setSaving(false); }
  };

  return <section aria-label="Partner cost management">
    <p style={{ color: '#64748b', lineHeight: 1.55 }}>Quotation amounts are estimates. A final cost is recorded only from an operator supplied provider invoice or statement reference. Missing charges and tax treatment remain unspecified; no profit or recoverability is calculated.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, margin: '16px 0' }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Courier code<input aria-label="Courier code" value={filters.partnerCode} onChange={e => setFilters(current => ({ ...current, partnerCode: e.target.value }))} style={input} placeholder="All couriers" /></label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>From<input aria-label="Cost from date" type="date" value={filters.from} onChange={e => setFilters(current => ({ ...current, from: e.target.value }))} style={input} /></label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>To<input aria-label="Cost to date" type="date" value={filters.to} onChange={e => setFilters(current => ({ ...current, to: e.target.value }))} style={input} /></label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Reconciliation status<select aria-label="Reconciliation status" value={filters.status} onChange={e => setFilters(current => ({ ...current, status: e.target.value }))} style={input}><option value="">All statuses</option><option value="UNAVAILABLE">Unavailable</option><option value="PENDING">Pending final cost</option><option value="CONFIRMED">Confirmed</option><option value="DISCREPANT">Discrepant</option></select></label>
      <button type="button" style={{ ...button, alignSelf: 'end' }} onClick={load}>Refresh</button>
    </div>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {notice && <p role="status" style={{ color: '#166534' }}>{notice}</p>}
    {loading ? <p role="status">Loading partner costs…</p> : <Table columns={['Shipment', 'AWB', 'Courier', 'Estimated cost', 'Final cost', 'Reconciliation', 'Details']} empty="No saved shipment costs match these filters.">
      {rows.map(row => <tr key={row.shipmentId}><td style={cell}>{row.reference || row.shipmentId}</td><td style={cell}>{row.waybill || '—'}</td><td style={cell}>{row.partnerName} ({row.partnerCode || '—'})</td><td style={cell}>{estimatedMoney(row.estimatedCost)}</td><td style={cell}>{money(row.finalCost?.amount, row.finalCost?.currency)}</td><td style={cell}>{statusLabel(row.reconciliationStatus)}</td><td style={cell}><button type="button" style={{ ...button, padding: '5px 9px' }} onClick={() => open(row)}>View cost</button></td></tr>)}
    </Table>}

    {selected && <div role="dialog" aria-modal="true" aria-labelledby="partner-cost-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0f172a66', display: 'grid', placeItems: 'center', padding: 16 }}><article style={{ background: '#fff', width: 'min(850px,100%)', maxHeight: '92vh', overflow: 'auto', padding: 22, borderRadius: 10 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 id="partner-cost-title" style={{ margin: 0 }}>Partner cost details</h2><p style={{ color: '#64748b' }}>{selected.reference || selected.shipmentId} · {selected.partnerName} · {statusLabel(selected.reconciliationStatus)}</p></div><button type="button" aria-label="Close cost details" style={button} onClick={() => setSelected(null)}>Close</button></header>
      <h3>Estimated partner quotation</h3><p>{estimatedMoney(selected.estimatedCost)} · Source: {selected.estimatedCost?.source || 'Unavailable'} · Quote reference: {selected.estimatedCost?.apiResponseReference || 'Unavailable'}</p><Breakdown value={selected.estimatedCost?.chargeBreakdown} />
      <h3>Final partner cost</h3>{selected.finalCost ? <><p>{money(selected.finalCost.amount, selected.finalCost.currency)} · Invoice reference: {selected.finalCost.sourceReference || 'Unavailable'} · Source: {selected.finalCost.source}</p><Breakdown value={selected.finalCost.chargeBreakdown} /><p>Variance (final minus estimate): {selected.variance == null ? 'Unavailable' : money(selected.variance, selected.varianceCurrency)}. Tax recoverability: {selected.finalCost.gstRecoverability ?? 'Not determined'}.</p>{selected.finalCost.taxBasis && <pre style={{ whiteSpace: 'pre-wrap' }}>Tax basis: {JSON.stringify(selected.finalCost.taxBasis, null, 2)}</pre>}</> : <p>No authoritative final cost is available. The estimate remains unchanged.</p>}
      {selected.finalCost == null && <form onSubmit={recordFinal} style={{ borderTop: '1px solid #e2e8f0', marginTop: 18, paddingTop: 12 }}><h3>Record provider invoice cost</h3><p style={{ color: '#92400e', fontSize: 12 }}>Use only a provider invoice or statement. This is operator-recorded data, not a carrier API confirmation. Do not infer charges or tax amounts.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Final total amount<input aria-label="Final total amount" type="number" min="0" step="any" required value={form.amount} onChange={e => setForm(v => ({ ...v, amount: e.target.value }))} style={input} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Currency<input aria-label="Final cost currency" required pattern="[A-Za-z]{3}" maxLength="3" value={form.currency} onChange={e => setForm(v => ({ ...v, currency: e.target.value.toUpperCase() }))} style={input} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Invoice / statement reference<input aria-label="Provider invoice reference" required maxLength="160" value={form.sourceReference} onChange={e => setForm(v => ({ ...v, sourceReference: e.target.value }))} style={input} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Invoice date (optional)<input aria-label="Provider invoice date" type="date" value={form.invoiceDate} onChange={e => setForm(v => ({ ...v, invoiceDate: e.target.value }))} style={input} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Charge breakdown JSON (optional)<textarea aria-label="Final charge breakdown JSON" value={form.chargeBreakdown} onChange={e => setForm(v => ({ ...v, chargeBreakdown: e.target.value }))} placeholder={'{"baseFreight":"0.00"}'} style={{ ...input, minHeight: 80 }} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Tax basis JSON (optional)<textarea aria-label="Tax basis JSON" value={form.taxBasis} onChange={e => setForm(v => ({ ...v, taxBasis: e.target.value }))} style={{ ...input, minHeight: 80 }} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Confirmed recoverable GST (optional)<input aria-label="Confirmed recoverable GST" type="number" min="0" step="any" value={form.gstRecoverability} onChange={e => setForm(v => ({ ...v, gstRecoverability: e.target.value }))} style={input} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, gridColumn: '1 / -1' }}>Notes (optional)<textarea maxLength="1000" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} style={{ ...input, minHeight: 65 }} /></label>
        </div><button type="submit" disabled={saving} style={{ ...button, marginTop: 12 }}>{saving ? 'Saving…' : 'Record final cost and reconcile'}</button>
      </form>}
      <h3>Reconciliation history</h3><Table columns={['Date', 'Status', 'Estimate', 'Final', 'Source reference']} empty="No reconciliation has been recorded.">{(selected.reconciliationHistory || []).map(item => <tr key={item.id}><td style={cell}>{item.reconciledAt}</td><td style={cell}>{statusLabel(item.status)}</td><td style={cell}>{money(item.estimatedAmount, item.estimatedCurrency)}</td><td style={cell}>{money(item.finalAmount, item.finalCurrency)}</td><td style={cell}>{item.sourceReference}</td></tr>)}</Table>
      <h3>Cost audit history</h3><Table columns={['Date', 'Action', 'Actor', 'Reference']} empty="No cost audit entries.">{(selected.costAuditTrail || []).map((item, index) => <tr key={`${item.at}-${index}`}><td style={cell}>{item.at}</td><td style={cell}>{item.action}</td><td style={cell}>{item.actor}</td><td style={cell}>{item.sourceReference || '—'}</td></tr>)}</Table>
    </article></div>}
  </section>;
}
