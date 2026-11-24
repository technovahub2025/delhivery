import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, unwrap } from '../../services/api';
import { buildCsv, csvEscape } from '../../utils/csv';

const input = { border: '1px solid #dbe2ec', borderRadius: 6, padding: '9px 11px', background: '#fff', minHeight: 38, color: '#334155' };
const button = { ...input, cursor: 'pointer', fontWeight: 600 };
const cell = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };
const money = (value, currency) => value == null ? 'Unavailable' : `${currency || ''} ${value}`.trim();
const monthNow = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const tabs = ['Monthly summary', 'Profit by period', 'Shipments', 'Customers', 'Couriers', 'Courier performance', 'Estimated vs final', 'Credit billing'];
const summaryColumns = ['Currency', 'Customer selling amount', 'Revenue ex GST', 'Estimated partner cost', 'Estimate ex GST', 'Final partner cost', 'Final ex GST', 'Confirmed gross profit', 'Provisional gross profit'];
const shipmentColumns = ['Date', 'Order / AWB', 'Customer', 'Courier', 'Status', 'Selling amount', 'Customer price breakdown', 'Revenue ex GST', 'Revenue GST', 'Revenue tax basis', 'Estimated cost', 'Estimate breakdown', 'Final cost', 'Final breakdown', 'Profit', 'Profit margin', 'Profit status'];
const customerColumns = ['Customer', 'Currency', 'Shipments', 'Selling amount', 'Revenue ex GST', 'Confirmed profit', 'Provisional profit', 'Profit status counts'];
const courierColumns = ['Courier', 'Currency', 'Shipments', 'Estimated cost', 'Final cost', 'Estimated ex GST', 'Final ex GST', 'Reconciliation / profit counts'];
const comparisonColumns = ['Order / AWB', 'Courier', 'Estimated cost', 'Final cost', 'Estimated ex GST', 'Final ex GST', 'Reconciliation', 'Profit status'];
const creditBillingColumns = ['Invoice', 'Customer', 'Billing period', 'Invoice date', 'Currency', 'Invoice total', 'Paid', 'Outstanding', 'Invoice status', 'Financial status'];

export { buildCsv, csvEscape } from '../../utils/csv';

function Table({ columns, rows, empty }) {
  return <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead><tr>{columns.map(name => <th key={name} style={{ textAlign: 'left', padding: 11, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{name}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row, index) => <tr key={`${index}-${row[0]}`}>{row.map((value, cellIndex) => <td key={cellIndex} style={cell}>{value ?? 'Unavailable'}</td>)}</tr>) : <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 22, color: '#64748b' }}>{empty}</td></tr>}</tbody>
  </table></div>;
}

function profitCounts(group) { return `Confirmed ${group.confirmedCount} · Provisional ${group.provisionalCount} · Config required ${group.configurationRequiredCount} · Unavailable ${group.unavailableCount}`; }
function breakdownText(value) { return value == null ? 'Unavailable' : JSON.stringify(value); }

export default function ProfitabilityReports() {
  const [periodMode, setPeriodMode] = useState('MONTH');
  const [period, setPeriod] = useState(monthNow);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('');
  const [tab, setTab] = useState(tabs[0]);
  const [granularity, setGranularity] = useState('daily');
  const [filterOptions, setFilterOptions] = useState({});
  const activeRequest = useRef(null);
  const activeExport = useRef(null);
  const [reportQuery, setReportQuery] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState('');
  const query = useMemo(() => ({ ...(periodMode === 'MONTH' ? { period } : { from, to }), ...(customerId ? { customerId } : {}), ...(partnerCode ? { partnerCode } : {}), ...(shipmentStatus ? { shipmentStatus } : {}) }), [periodMode, period, from, to, customerId, partnerCode, shipmentStatus]);
  const load = useCallback(async () => {
    activeRequest.current?.abort();
    setExporting(''); setNotice('');
    if (periodMode === 'CUSTOM' && (!from || !to)) { setReport(null); setLoading(false); setError('Choose both start and end dates.'); return; }
    const controller = new AbortController();
    activeRequest.current = controller;
    setReport(null); setLoading(true); setError('');
    try {
      const data = unwrap(await api.profitabilityReport(query, controller.signal));
      if (controller.signal.aborted) return;
      setReport(data); setReportQuery(query); setFilterOptions(data.filterOptions || {});
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Profitability report could not be loaded.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [periodMode, from, to, query]);
  useEffect(() => {
    load();
    return () => { activeRequest.current?.abort(); activeExport.current?.abort(); };
  }, [load]);

  const summaryRows = (report?.summary?.currencies || []).map(row => [row.currency, money(row.customerSellingAmount, row.currency), money(row.customerRevenueExGst, row.currency), money(row.estimatedPartnerCost, row.currency), money(row.estimatedPartnerCostExGst, row.currency), money(row.finalPartnerCost, row.currency), money(row.finalPartnerCostExGst, row.currency), money(row.confirmedGrossProfit, row.currency), money(row.provisionalGrossProfit, row.currency)]);
  const shipmentRows = (report?.shipments || []).map(row => [row.shipmentDate?.slice(0, 10) || 'Unavailable', [row.reference, row.waybill].filter(Boolean).join(' / '), row.customer.name, `${row.courier.name} (${row.courier.code || '—'})`, row.shipmentStatus || row.bookingStatus || 'Unavailable', money(row.customerSellingAmount, row.currency), breakdownText(row.customerChargeBreakdown), money(row.customerRevenueExGst, row.customerRevenueCurrency), money(row.revenueTaxAmount, row.customerRevenueCurrency), row.revenueTaxBasisStatus, (row.estimatedPartnerCostSource === 'LOCAL_MOCK_ONLY' ? 'SAMPLE ' : '') + money(row.estimatedPartnerCost, row.estimatedPartnerCostCurrency), breakdownText(row.estimatedPartnerCostBreakdown), money(row.finalPartnerCost, row.finalPartnerCostCurrency), breakdownText(row.finalPartnerCostBreakdown), money(row.grossProfit, row.grossProfitCurrency), row.profitMarginPercent == null ? null : String(row.profitMarginPercent) + '%', `${row.profitStatus}${row.profitReason ? ` · ${row.profitReason}` : ''}`]);
  const customerRows = (report?.customers || []).flatMap(group => (group.currencies || []).map(item => [group.key, item.currency, group.shipmentCount, money(item.customerSellingAmount, item.currency), money(item.customerRevenueExGst, item.currency), money(item.confirmedGrossProfit, item.currency), money(item.provisionalGrossProfit, item.currency), profitCounts(group)]));
  const courierRows = (report?.couriers || []).flatMap(group => (group.currencies || []).map(item => [group.key, item.currency, group.shipmentCount, money(item.estimatedPartnerCost, item.currency), money(item.finalPartnerCost, item.currency), money(item.estimatedPartnerCostExGst, item.currency), money(item.finalPartnerCostExGst, item.currency), profitCounts(group)]));
  const comparisonRows = (report?.shipments || []).map(row => [[row.reference, row.waybill].filter(Boolean).join(' / '), row.courier.name, (row.estimatedPartnerCostSource === 'LOCAL_MOCK_ONLY' ? 'SAMPLE ' : '') + money(row.estimatedPartnerCost, row.estimatedPartnerCostCurrency), money(row.finalPartnerCost, row.finalPartnerCostCurrency), money(row.estimatedPartnerCostExGst, row.estimatedPartnerCostCurrency), money(row.finalPartnerCostExGst, row.finalPartnerCostCurrency), row.costReconciliationStatus, row.profitStatus]);
  const creditBillingRows = (report?.creditBillingSummary?.invoices || []).map(row => [row.invoiceNumber, row.customer, row.period, row.invoiceDate?.slice(0, 10) || 'Unavailable', row.currency || 'Unavailable', money(row.totalAmount, row.currency), money(row.paidAmount, row.currency), money(row.outstandingAmount, row.currency), row.status, row.financialStatus]);
  const periodColumns = ['Period start', 'Currency', 'Shipments', 'Confirmed profit', 'Provisional profit'];
  const periodRows = (report?.profitPeriods?.[granularity] || []).flatMap(group => group.currencies.map(row => [group.key, row.currency, group.shipmentCount, money(row.confirmedGrossProfit, row.currency), money(row.provisionalGrossProfit, row.currency)]));
  const performanceColumns = ['Courier', 'Code', 'Shipments', 'Delivered', 'In transit', 'Exceptions', 'Unmapped', 'Sample'];
  const performanceRows = (report?.courierPerformance || []).map(row => [row.name, row.code, row.shipmentCount, row.deliveredCount, row.inTransitCount, row.exceptionCount, row.unmappedCount, row.sampleCount]);
  const content = {
    'Courier performance': [performanceColumns, performanceRows],
    'Profit by period': [periodColumns, periodRows],
    'Monthly summary': [summaryColumns, summaryRows],
    Shipments: [shipmentColumns, shipmentRows],
    Customers: [customerColumns, customerRows],
    Couriers: [courierColumns, courierRows],
    'Estimated vs final': [comparisonColumns, comparisonRows],
    'Credit billing': [creditBillingColumns, creditBillingRows],
  }[tab];

  function exportCsv() {
    if (!content || reportQuery !== query) return;
    const csv = buildCsv(content[0], content[1]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `profitability-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${report?.period?.label || 'range'}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setNotice('CSV export prepared for the currently filtered report.');
  }

  async function exportReport(format) {
    if (!report || reportQuery !== query) return;
    const controller = new AbortController();
    activeExport.current = controller;
    setExporting(format); setError(''); setNotice('');
    try {
      const result = await api.profitabilityExport(format, query, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url; link.download = result.filename || `profitability-report.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setNotice(`${format.toUpperCase()} export prepared for the currently filtered report.`);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || `${format.toUpperCase()} export could not be prepared.`);
    } finally { if (activeExport.current === controller) setExporting(''); }
  }

  return <section aria-label="Profitability reports">
    <p style={{ color: '#64748b', lineHeight: 1.55 }}>Gross profit follows the SRD formula: customer revenue excluding GST minus partner cost excluding only confirmed recoverable GST. Selling amounts, estimated costs and final costs are reported separately. Incomplete tax bases or missing final costs are labeled; currencies are never converted.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 10, margin: '16px 0' }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Date basis<select aria-label="Report date basis" value={periodMode} onChange={event => setPeriodMode(event.target.value)} style={input}><option value="MONTH">Month</option><option value="CUSTOM">Custom range</option></select></label>
      {periodMode === 'MONTH' ? <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Month<input aria-label="Report month" type="month" value={period} onChange={event => setPeriod(event.target.value)} style={input} /></label> : <><label style={{ display: 'grid', gap: 4, fontSize: 12 }}>From<input aria-label="Report from date" type="date" value={from} onChange={event => setFrom(event.target.value)} style={input} /></label><label style={{ display: 'grid', gap: 4, fontSize: 12 }}>To<input aria-label="Report to date" type="date" value={to} onChange={event => setTo(event.target.value)} style={input} /></label></>}
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Customer<select aria-label="Report customer" value={customerId} onChange={event => setCustomerId(event.target.value)} style={input}><option value="">All customers</option>{(filterOptions.customers || []).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Courier<select aria-label="Report courier" value={partnerCode} onChange={event => setPartnerCode(event.target.value)} style={input}><option value="">All couriers</option>{(filterOptions.couriers || []).map(courier => <option key={courier.code} value={courier.code}>{courier.name} ({courier.code})</option>)}</select></label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Shipment status<select aria-label="Report shipment status" value={shipmentStatus} onChange={event => setShipmentStatus(event.target.value)} style={input}><option value="">All statuses</option>{(filterOptions.shipmentStatuses || []).map(status => <option key={status}>{status}</option>)}</select></label>
      <button type="button" style={button} onClick={load} disabled={loading}>Refresh</button>
      <button type="button" style={button} onClick={exportCsv} disabled={!report || loading || Boolean(exporting)}>Export CSV</button>
      <button type="button" style={button} onClick={() => exportReport('xlsx')} disabled={!report || loading || Boolean(exporting)}>{exporting === 'xlsx' ? 'Preparing Excel…' : 'Export Excel (.xlsx)'}</button>
      <button type="button" style={button} onClick={() => exportReport('pdf')} disabled={!report || loading || Boolean(exporting)}>{exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}</button>
    </div>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error} <button type="button" style={button} onClick={load}>Retry</button></p>}
    {notice && <p role="status" style={{ color: '#166534' }}>{notice}</p>}
    {loading && <p role="status">Loading profitability report…</p>}
    {report && reportQuery === query && <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px', marginBottom: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
        <span><strong>Shipment date range:</strong> {report.period.label}</span><span>·</span><span>Shipments: {report.summary.shipmentCount}</span><span>·</span><span>Confirmed profit: {report.summary.confirmedCount}</span><span>·</span><span>Provisional: {report.summary.provisionalCount}</span><span>·</span><span>Configuration required: {report.summary.configurationRequiredCount}</span><span>·</span><span>Unavailable: {report.summary.unavailableCount}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>{tabs.map(name => <button type="button" key={name} onClick={() => setTab(name)} style={{ padding: '11px 8px', border: 0, borderBottom: tab === name ? '2px solid #526dff' : '2px solid transparent', background: 'transparent', color: tab === name ? '#526dff' : '#334155', cursor: 'pointer', fontWeight: tab === name ? 650 : 500 }}>{name}</button>)}</div>
      {tab === 'Monthly summary' && <><Table columns={summaryColumns} rows={summaryRows} empty="No shipment data is available for this range." /><p style={{ fontSize: 12, color: '#64748b' }}>Totals are grouped by currency. Gross profit is blank from totals where its tax or cost basis is incomplete; see shipment details for the reason.</p></>}
      {tab === 'Profit by period' && <><label>Group profit by <select value={granularity} onChange={event => setGranularity(event.target.value)}><option value="daily">Day</option><option value="weekly">Week (Monday start)</option><option value="monthly">Month</option></select></label><Table columns={periodColumns} rows={periodRows} empty="No shipment data is available for this range." /></>}
      {tab === 'Shipments' && <Table columns={shipmentColumns} rows={shipmentRows} empty="No shipments match this range and filter." />}
      {tab === 'Customers' && <Table columns={customerColumns} rows={customerRows} empty="No customer revenue data is available for this range." />}
      {tab === 'Couriers' && <Table columns={courierColumns} rows={courierRows} empty="No courier cost data is available for this range." />}
      {tab === 'Courier performance' && <><p>Counts use the latest stored tracking status for each shipment. Unmapped statuses and sample shipments have separate counts.</p><Table columns={performanceColumns} rows={performanceRows} empty="No courier shipments match this range and filter." /></>}
      {tab === 'Estimated vs final' && <Table columns={comparisonColumns} rows={comparisonRows} empty="No shipment cost comparisons are available for this range." />}
      {tab === 'Credit billing' && <><p style={{ color: '#64748b', fontSize: 12 }}>Current owner-scoped invoice balances linked wholly to the selected shipment filters. These are current balances, not historical balances as of the report end date.</p><p role="status">Billing data: {report.creditBillingSummary?.status || 'UNAVAILABLE'}{report.creditBillingSummary?.reason ? ` · ${report.creditBillingSummary.reason}` : ''}{report.creditBillingSummary?.excludedInvoiceCount ? ` · ${report.creditBillingSummary.excludedInvoiceCount} invoice(s) excluded because they include shipments outside these filters.` : ''}</p><Table columns={creditBillingColumns} rows={creditBillingRows} empty="No complete credit invoice balance maps to this report's filtered shipment set." />{(report.creditBillingSummary?.byPeriodCurrency || []).length > 0 && <Table columns={['Billing period', 'Currency', 'Invoices', 'Invoice total', 'Paid', 'Outstanding', 'Status']} rows={report.creditBillingSummary.byPeriodCurrency.map(row => [row.period, row.currency || 'Unavailable', row.invoiceCount, money(row.totalAmount, row.currency), money(row.paidAmount, row.currency), money(row.outstandingAmount, row.currency), row.status])} empty="No monthly billing totals are available." />}</>}
      <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Report aggregates use shipment date ({report.period.dateBasis}). They do not alter invoices, payment allocations, shipment snapshots or partner cost records. Payments are not subtracted from revenue.</p>
    </>}
  </section>;
}
