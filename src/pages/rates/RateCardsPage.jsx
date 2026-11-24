import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '../../services/api';
import { Button, Empty, Field, PageHeading, Pagination } from '../../components/ui';
import RateCardFormDialog from '../../components/rates/RateCardFormDialog';
import '../../styles/rate-cards.css';

const PAGE_SIZE = 10;
const customerName = customer => customer?.displayName || customer?.companyName || customer?.primaryContact?.name || 'Unnamed customer';

export default function RateCardsPage({ notify = () => {} }) {
  const [cards, setCards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customersError, setCustomersError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    api.customers({ category: 'CREDIT', page: 1, limit: 100 }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setCustomers(result?.data?.customers || []); })
      .catch(loadError => { if (!controller.signal.aborted && loadError?.name !== 'AbortError') setCustomersError(loadError?.message || 'Customers could not be loaded.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.rateCards({ scope, customerId, search, page, limit: PAGE_SIZE }, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setCards(result?.data?.rateCards || []); setTotal(result?.data?.total || 0); } })
      .catch(loadError => { if (!controller.signal.aborted && loadError?.name !== 'AbortError') setError(loadError?.message || 'Rate cards could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, customerId, search, page, reload]);

  const customerMap = useMemo(() => new Map(customers.map(customer => [customer.id, customer])), [customers]);

  async function save(payload, createVersion = false) {
    if (createVersion && editing?.id) await api.createRateCardVersion(editing.id, payload);
    else if (editing?.id) await api.updateRateCard(editing.id, payload);
    else await api.createRateCard(payload);
    setEditing(null); setReload(value => value + 1);
    notify(createVersion ? 'New rate card version created.' : editing ? 'Rate card updated.' : 'Rate card created.');
  }

  return <div className="page rate-cards-page">
    <div className="rate-cards-heading"><PageHeading eyebrow="MANAGEMENT" title="Rate Master" description="Manage customer-specific and standard walk-in rate cards." /><Button type="button" onClick={() => setEditing('new')}><Plus size={16} /> Create rate card</Button></div>
    <section className="card rate-cards-card" aria-label="Rate card list">
      <div className="table-toolbar rate-cards-toolbar">
        <label className="search-input" htmlFor="rate-card-search"><Search size={16} /><input id="rate-card-search" aria-label="Search rate card name" type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search rate card name" /></label>
        <Field label="Scope"><select aria-label="Filter rate cards by scope" value={scope} onChange={event => { setScope(event.target.value); setPage(1); }}><option value="">All scopes</option><option value="CUSTOMER">Customer-specific</option><option value="WALK_IN_STANDARD">Standard walk-in</option></select></Field>
        {scope === 'CUSTOMER' && <Field label="Credit customer"><select aria-label="Filter rate cards by customer" value={customerId} onChange={event => { setCustomerId(event.target.value); setPage(1); }}><option value="">All customers</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customerName(customer)}</option>)}</select></Field>}
        <Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)} disabled={loading}><RefreshCw size={15} /> Refresh</Button>
      </div>
      {customersError && <p className="rate-card-error" role="alert">{customersError}</p>}
      {error ? <div className="rate-card-error" role="alert"><p>{error}</p><Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)}>Try again</Button></div>
        : loading ? <p className="rate-card-loading" role="status">Loading rate cards...</p>
          : cards.length === 0 ? <Empty title={search || scope || customerId ? 'No matching rate cards' : 'No rate cards yet'} description="Create a customer-specific or standard walk-in rate card to begin." />
            : <div className="rate-card-table-wrap"><table className="rate-card-table"><thead><tr><th>Name</th><th>Scope</th><th>Customer</th><th>Version</th><th>Effective</th><th>Zones</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {cards.map(card => <tr key={card.id}><td><strong>{card.name || 'Unnamed rate card'}</strong><small>{card.currency || ''}</small></td><td>{card.scope === 'CUSTOMER' ? 'Customer-specific' : 'Standard walk-in'}</td><td>{card.scope === 'CUSTOMER' ? customerName(customerMap.get(card.customerId)) : 'All walk-in customers'}</td><td>v{card.version}</td><td>{card.effectiveFrom ? new Date(card.effectiveFrom).toLocaleDateString() : 'No start date'}{card.effectiveTo ? ` – ${new Date(card.effectiveTo).toLocaleDateString()}` : ''}</td><td>{card.zoneRates?.length || 0}</td><td><Button type="button" variant="secondary" onClick={() => setEditing(card)} aria-label={`Edit ${card.name || 'rate card'}`}><Pencil size={14} /> Edit</Button></td></tr>)}
            </tbody></table></div>}
      {!error && !loading && total > 0 && <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="rate cards" />}
    </section>
    {editing && <RateCardFormDialog card={editing === 'new' ? null : editing} customers={customers} onClose={() => setEditing(null)} onSave={save} />}
  </div>;
}
