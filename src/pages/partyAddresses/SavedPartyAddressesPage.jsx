import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Field, Empty, PageHeading, Pagination } from '../../components/ui';
import { api } from '../../services/api';
import SavedPartyAddressFormDialog from '../../components/partyAddresses/SavedPartyAddressFormDialog';
import '../../styles/saved-party-addresses.css';

const PAGE_SIZE = 10;
const partyTypeOptions = [
  ['', 'All party types'],
  ['SHIPPER', 'Shipper'],
  ['CONSIGNEE', 'Consignee'],
  ['PICKUP', 'Pickup'],
];
const partyTypeLabel = value => ({ SHIPPER: 'Shipper', CONSIGNEE: 'Consignee', PICKUP: 'Pickup' }[value] || value);
const customerLabel = customer => customer?.displayName || customer?.companyName || customer?.primaryContact?.name || 'Unnamed customer';
const addressTitle = address => address.companyName || address.contactName || 'Saved address';
const addressPreview = address => [...(address.addressLines || []), [address.city, address.state].filter(Boolean).join(', '), address.pincode].filter(Boolean).join(' / ') || 'No address details';
const displayContact = address => [address.contactName, address.phone, address.email].filter(Boolean).join(' / ') || '-';

function AddressDetailsDialog({ id, customers, onClose }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setAddress(null);
    api.partyAddress(id, controller.signal).then(result => {
      if (!controller.signal.aborted) setAddress(result?.data?.partyAddress || null);
    }).catch(loadError => {
      if (!controller.signal.aborted && loadError?.name !== 'AbortError') setError(loadError?.message || 'Saved address could not be loaded.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);

  return <div className="party-address-detail-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="party-address-detail card" role="dialog" aria-modal="true" aria-label="Saved address details">
      <div className="party-address-detail-heading"><div><span className="eyebrow">ADDRESS BOOK</span><h2>Saved address details</h2></div><button className="icon-btn" aria-label="Close details" onClick={onClose}>Close</button></div>
      {loading ? <p role="status">Loading saved address...</p> : error ? <div className="party-address-inline-error" role="alert"><span>{error}</span><Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)}>Try again</Button></div> : address ? <dl className="party-address-detail-grid">
        <div><dt>Party type</dt><dd>{partyTypeLabel(address.partyType)}</dd></div>
        <div><dt>Customer</dt><dd>{address.customerId ? customerLabel(customers.find(customer => customer.id === address.customerId)) : 'Not associated'}</dd></div>
        <div><dt>Company</dt><dd>{address.companyName || '-'}</dd></div>
        <div><dt>Contact</dt><dd>{displayContact(address)}</dd></div>
        <div><dt>Address</dt><dd>{addressPreview(address)}</dd></div>
        <div><dt>GSTIN</dt><dd>{address.gstin || '-'}</dd></div>
      </dl> : <Empty title="Address unavailable" description="The saved address could not be found." />}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
    </section>
  </div>;
}

export default function SavedPartyAddressesPage({ notify = () => {}, initialSearch = '' }) {
  const [addresses, setAddresses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [partyType, setPartyType] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [error, setError] = useState('');
  const [customersError, setCustomersError] = useState('');
  const [reload, setReload] = useState(0);
  const [customerReload, setCustomerReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.partyAddresses({ search, partyType, customerId, page, limit: PAGE_SIZE }, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setAddresses(result?.data?.partyAddresses || []);
        setTotal(result?.data?.total || 0);
      }
    }).catch(loadError => {
      if (!controller.signal.aborted && loadError?.name !== 'AbortError') setError(loadError?.message || 'Saved addresses could not be loaded.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, partyType, customerId, page, reload]);

  useEffect(() => {
    const controller = new AbortController();
    setCustomersLoading(true); setCustomersError('');
    api.customers({ page: 1, limit: 100 }, controller.signal).then(result => {
      if (!controller.signal.aborted) setCustomers(result?.data?.customers || []);
    }).catch(loadError => {
      if (!controller.signal.aborted && loadError?.name !== 'AbortError') setCustomersError(loadError?.message || 'Customers could not be loaded.');
    }).finally(() => { if (!controller.signal.aborted) setCustomersLoading(false); });
    return () => controller.abort();
  }, [customerReload]);

  async function save(payload) {
    const creating = editing === 'new';
    if (creating) await api.createPartyAddress(payload);
    else await api.updatePartyAddress(editing.id, payload);
    setEditing(null); setReload(value => value + 1);
    notify(creating ? 'Saved address created.' : 'Saved address updated.');
  }

  return <div className="page party-addresses-page">
    <div className="party-addresses-heading"><PageHeading eyebrow="MANAGEMENT" title="Saved Addresses" description="Keep shipper, consignee, and pickup contacts available for reuse." /><Button type="button" onClick={() => setEditing('new')}><Plus size={16} /> Add address</Button></div>
    <section className="card party-addresses-card" aria-label="Saved party addresses">
      <div className="party-addresses-toolbar">
        <Field label="Search addresses" name="partyAddressSearch"><input id="partyAddressSearch" type="search" value={searchInput} maxLength={200} onChange={event => setSearchInput(event.target.value)} placeholder="Search contact, company, or address" /></Field>
        <Field label="Party type" name="partyAddressType"><select id="partyAddressType" value={partyType} onChange={event => { setPartyType(event.target.value); setPage(1); }}>{partyTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Customer" name="partyAddressCustomer"><select id="partyAddressCustomer" value={customerId} onChange={event => { setCustomerId(event.target.value); setPage(1); }}><option value="">All customers</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customerLabel(customer)}</option>)}</select></Field>
        <Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)} disabled={loading}>Refresh</Button>
      </div>
      {customersError && <div className="party-address-inline-error" role="alert"><span>{customersError}. Customer filtering and association choices are unavailable.</span><Button type="button" variant="secondary" onClick={() => setCustomerReload(value => value + 1)}>Retry customers</Button></div>}
      {error ? <div className="party-address-load-error" role="alert"><p>{error}</p><Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)}>Try again</Button></div>
        : loading ? <div className="party-address-loading" role="status">Loading saved addresses...</div>
          : addresses.length === 0 ? <Empty title={search || partyType || customerId ? 'No matching saved addresses' : 'No saved addresses yet'} description="Add a shipper, consignee, or pickup address to build your address book." />
            : <><div className="party-addresses-table-wrap"><table className="party-addresses-table"><thead><tr><th>Party</th><th>Type</th><th>Customer</th><th>Contact</th><th>Address</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{addresses.map(address => <tr key={address.id}><td><strong>{addressTitle(address)}</strong>{address.companyName && address.contactName && <small>{address.contactName}</small>}</td><td><span className={`party-type-badge ${address.partyType?.toLowerCase()}`}>{partyTypeLabel(address.partyType)}</span></td><td>{customers.find(customer => customer.id === address.customerId) ? customerLabel(customers.find(customer => customer.id === address.customerId)) : address.customerId ? 'Associated customer' : '-'}</td><td>{displayContact(address)}</td><td className="party-address-preview">{addressPreview(address)}</td><td className="party-address-actions"><Button type="button" variant="secondary" onClick={() => setViewingId(address.id)} aria-label={`View ${addressTitle(address)}`}>View</Button><Button type="button" variant="secondary" onClick={() => setEditing(address)} aria-label={`Edit ${addressTitle(address)}`}>Edit</Button></td></tr>)}</tbody></table></div><Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="saved addresses" /></>}
    </section>
    {editing && <SavedPartyAddressFormDialog address={editing === 'new' ? null : editing} customers={customers} customersLoading={customersLoading} customersError={customersError} onRetryCustomers={() => setCustomerReload(value => value + 1)} onClose={() => setEditing(null)} onSave={save} />}
    {viewingId && <AddressDetailsDialog id={viewingId} customers={customers} onClose={() => setViewingId(null)} />}
  </div>;
}
