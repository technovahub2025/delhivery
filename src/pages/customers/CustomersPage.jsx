import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { api, unwrap } from '../../services/api';
import { Button, Empty, Modal, PageHeading, Pagination } from '../../components/ui';
import CustomerFormDialog from '../../components/customers/CustomerFormDialog';
import '../../styles/customer-management.css';

const PAGE_SIZE = 10;
const customerLabel = customer => customer.displayName || customer.companyName || customer.primaryContact?.name || 'Unnamed customer';
const contactLabel = customer => [customer.primaryContact?.name, customer.primaryContact?.phone, customer.primaryContact?.email].filter(Boolean).join(' · ') || '—';

export default function CustomersPage({ notify = () => {}, initialSearch = '' }) {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerRetry, retryLedger] = useState(0);

  useEffect(() => {
    if (!ledgerCustomer) return undefined;
    const controller = new AbortController();
    setLedger(null);
    setLedgerError('');
    api.customerOutstanding(ledgerCustomer.id, controller.signal).then(response => {
      if (!controller.signal.aborted) setLedger(unwrap(response));
    }).catch(failure => {
      if (!controller.signal.aborted) setLedgerError(failure.message || 'The invoice ledger could not be loaded.');
    });
    return () => controller.abort();
  }, [ledgerCustomer, ledgerRetry]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const result = await api.customers({ search, category, page, limit: PAGE_SIZE }, signal);
      if (!signal?.aborted) { setCustomers(result?.data?.customers || []); setTotal(result?.data?.total || 0); }
    } catch (loadError) {
      if (!signal?.aborted && loadError.name !== 'AbortError') setError(loadError.message || 'Customers could not be loaded.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [search, category, page]);

  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [load, reload]);

  async function save(payload) {
    const creating = editing === 'new';
    if (creating) await api.createCustomer(payload);
    else await api.updateCustomer(editing.id, payload);
    setEditing(null); setReload(value => value + 1);
    notify(creating ? 'Customer created.' : 'Customer updated.');
  }

  return <div className="page customers-page">
    <div className="customers-page-heading"><PageHeading eyebrow="MANAGEMENT" title="Customers" description="Manage credit and walk-in customer profiles." /><Button type="button" onClick={() => setEditing('new')}><Plus size={16} /> Add customer</Button></div>
    <section className="card customers-card" aria-label="Customer list">
      <div className="table-toolbar customers-toolbar">
        <label className="search-input" htmlFor="customer-search"><Search size={16} /><input id="customer-search" aria-label="Search customers by name or contact" type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search name, company, or contact" /></label>
        <label className="customer-category-filter"><span>Category</span><select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} aria-label="Filter by category"><option value="">All customers</option><option value="CREDIT">Credit</option><option value="WALK_IN">Walk-in</option></select></label>
        <Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)} disabled={loading}><RefreshCw size={15} /> Refresh</Button>
      </div>
      {error ? <div className="customer-load-error" role="alert"><p>{error}</p><Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)}>Try again</Button></div>
        : loading ? <div className="customer-loading" role="status" aria-live="polite"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="customer-loading-label">Loading customers…</span></div>
        : customers.length === 0 ? <Empty title={search || category ? 'No matching customers' : 'No customers yet'} description={search || category ? 'Try another search or category.' : 'Add a customer to begin managing your customer profiles.'} />
        : <><div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Category</th><th>Contact</th><th>GSTIN</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{customers.map(customer => <tr key={customer.id}><td><strong>{customerLabel(customer)}</strong>{customer.companyName && customer.companyName !== customerLabel(customer) && <small>{customer.companyName}</small>}</td><td><span className={`customer-category-badge ${customer.category === 'CREDIT' ? 'credit' : 'walk-in'}`}>{customer.category === 'CREDIT' ? 'Credit' : 'Walk-in'}</span></td><td>{contactLabel(customer)}</td><td>{customer.gstin || '—'}</td><td>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : '—'}</td><td><Button type="button" variant="secondary" className="customer-edit-button" onClick={() => setEditing(customer)} aria-label={`Edit ${customerLabel(customer)}`}><Pencil size={14} /> Edit</Button>{customer.category === 'CREDIT' && <Button type="button" variant="secondary" onClick={() => setLedgerCustomer(customer)} aria-label={`View ledger for ${customerLabel(customer)}`}>View ledger</Button>}</td></tr>)}</tbody>
        </table></div><Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="customers" /></>}
    </section>
    {ledgerCustomer && <Modal title={customerLabel(ledgerCustomer) + ' credit ledger'} onClose={() => setLedgerCustomer(null)}>
      <p>Legacy balance (reference): {ledgerCustomer.outstandingBalance ?? 'Unavailable'}</p>
      {ledgerError ? <div role="alert">{ledgerError}<Button type="button" onClick={() => retryLedger(value => value + 1)}>Retry ledger</Button></div>
        : !ledger ? <p role="status">Loading invoice ledger...</p>
        : <>
          <p>Current invoice outstanding: {ledger.mixedCurrencies ? 'Multiple currencies. See individual invoices.' : [ledger.currency, ledger.totalOutstanding ?? 'Unavailable'].filter(Boolean).join(' ')}</p>
          {ledger.invoices?.length ? <ul>{ledger.invoices.map(invoice => <li key={invoice.id}>{invoice.invoiceNumber} - {invoice.currency} {invoice.outstandingAmount} - {invoice.status}</li>)}</ul> : <p>No unpaid invoices.</p>}
        </>}
    </Modal>}
    {editing && <CustomerFormDialog customer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
  </div>;
}
