import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfitabilityReports, { buildCsv } from './ProfitabilityReports';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: { profitabilityReport: jest.fn(), profitabilityExport: jest.fn() }, unwrap: value => value?.data ?? value }));

const report = {
  period: { label: '2026-10', dateBasis: 'SHIPMENT_DATE' },
  summary: { shipmentCount: 2, confirmedCount: 1, provisionalCount: 1, configurationRequiredCount: 0, unavailableCount: 0, currencies: [{ currency: 'INR', customerSellingAmount: '320', customerRevenueExGst: '300.50', estimatedPartnerCost: '108', finalPartnerCost: '50', estimatedPartnerCostExGst: '108', finalPartnerCostExGst: '45', confirmedGrossProfit: '55.50', provisionalGrossProfit: '140', revenueIncompleteCount: 0, costIncompleteCount: 0 }] },
  shipments: [
    { shipmentId: 'shipment-1', reference: 'DUMMY-1', waybill: 'MOCK-AWB-1', shipmentDate: '2026-10-05', shipmentStatus: 'Delivered', bookingStatus: 'AWB_GENERATED', mode: 'SURFACE', customer: { id: 'cust-1', name: 'Dummy Customer' }, courier: { code: 'MOCK_A', name: 'Mock Carrier A' }, currency: 'INR', customerSellingAmount: '120', customerSellingCurrency: 'INR', customerRevenueExGst: '100.50', customerRevenueCurrency: 'INR', estimatedPartnerCost: '48', estimatedPartnerCostCurrency: 'INR', estimatedPartnerCostExGst: '48', finalPartnerCost: '50', finalPartnerCostCurrency: 'INR', finalPartnerCostExGst: '45', costReconciliationStatus: 'DISCREPANT', grossProfit: '55.50', grossProfitCurrency: 'INR', profitStatus: 'CONFIRMED' },
    { shipmentId: 'shipment-2', reference: 'DUMMY-2', waybill: null, shipmentDate: '2026-10-06', shipmentStatus: 'In Transit', bookingStatus: 'AWB_GENERATED', customer: { id: 'cust-1', name: 'Dummy Customer' }, courier: { code: 'MOCK_A', name: 'Mock Carrier A' }, currency: 'INR', customerSellingAmount: '200', customerSellingCurrency: 'INR', customerRevenueExGst: '200', customerRevenueCurrency: 'INR', estimatedPartnerCost: '60', estimatedPartnerCostCurrency: 'INR', estimatedPartnerCostExGst: '60', finalPartnerCost: null, finalPartnerCostCurrency: null, finalPartnerCostExGst: null, costReconciliationStatus: 'PENDING', grossProfit: '140', grossProfitCurrency: 'INR', profitStatus: 'PROVISIONAL', profitReason: 'Estimate only' },
  ],
  customers: [{ key: 'Dummy Customer (cust-1)', shipmentCount: 2, confirmedCount: 1, provisionalCount: 1, configurationRequiredCount: 0, unavailableCount: 0, currencies: [{ currency: 'INR', customerSellingAmount: '320', customerRevenueExGst: '300.50' }] }],
  couriers: [{ key: 'MOCK_A', shipmentCount: 2, confirmedCount: 1, provisionalCount: 1, configurationRequiredCount: 0, unavailableCount: 0, currencies: [{ currency: 'INR', estimatedPartnerCost: '108', finalPartnerCost: '50', estimatedPartnerCostExGst: '108', finalPartnerCostExGst: '45' }] }],
  creditBillingSummary: { status: 'READY', reason: 'Current invoice balances.', excludedInvoiceCount: 0, invoices: [{ invoiceNumber: 'DUMMY-INV-1', customer: 'Dummy Customer', customerId: 'cust-1', period: '2026-10', invoiceDate: '2026-10-31T00:00:00.000Z', currency: 'INR', totalAmount: '120', paidAmount: '40', outstandingAmount: '80', status: 'PARTIALLY_PAID', financialStatus: 'READY' }], byPeriodCurrency: [{ period: '2026-10', currency: 'INR', invoiceCount: 1, totalAmount: '120', paidAmount: '40', outstandingAmount: '80', status: 'READY' }] },
  filterOptions: { customers: [{ id: 'cust-1', name: 'Dummy Customer' }], couriers: [{ code: 'MOCK_A', name: 'Mock Carrier A' }], shipmentStatuses: ['Delivered', 'In Transit'] },
};

beforeEach(() => {
  jest.clearAllMocks();
  api.profitabilityReport.mockResolvedValue({ data: report });
});

test('renders monthly summaries and keeps estimated cost distinct from confirmed profit', async () => {
  render(<ProfitabilityReports />);
  expect(await screen.findByText('Confirmed gross profit')).toBeInTheDocument();
  expect(screen.getByText('INR 55.50')).toBeInTheDocument();
  expect(screen.getByText('Provisional: 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Shipments' }));
  expect(screen.getByText(/CONFIRMED/)).toBeInTheDocument();
  expect(screen.getByText(/PROVISIONAL · Estimate only/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Estimated vs final' }));
  expect(screen.getByText('PENDING')).toBeInTheDocument();
  expect(screen.getByText('DISCREPANT')).toBeInTheDocument();
});

test('shows credit customer outstanding and monthly billing from invoice snapshots', async () => {
  render(<ProfitabilityReports />);
  await screen.findByText('Confirmed gross profit');
  fireEvent.click(screen.getByRole('button', { name: 'Credit billing' }));
  expect(screen.getByText('DUMMY-INV-1')).toBeInTheDocument();
  expect(screen.getAllByText('INR 80').length).toBeGreaterThan(0);
  expect(screen.getByText(/Current owner-scoped invoice balances/)).toBeInTheDocument();
});

test('sends custom date, customer, courier and shipment status filters', async () => {
  render(<ProfitabilityReports />);
  await screen.findByText('Confirmed gross profit');
  fireEvent.change(screen.getByLabelText('Report date basis'), { target: { value: 'CUSTOM' } });
  fireEvent.change(screen.getByLabelText('Report from date'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Report to date'), { target: { value: '2026-10-31' } });
  await waitFor(() => expect(api.profitabilityReport).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-31' }), expect.anything()));
  await screen.findByRole('option', { name: 'Dummy Customer' });
  await userEvent.selectOptions(screen.getByLabelText('Report customer'), 'cust-1');
  await waitFor(() => expect(api.profitabilityReport).toHaveBeenLastCalledWith(expect.objectContaining({ customerId: 'cust-1' }), expect.anything()));
  await userEvent.selectOptions(screen.getByLabelText('Report courier'), 'MOCK_A');
  await waitFor(() => expect(api.profitabilityReport).toHaveBeenLastCalledWith(expect.objectContaining({ customerId: 'cust-1', partnerCode: 'MOCK_A' }), expect.anything()));
  await userEvent.selectOptions(screen.getByLabelText('Report shipment status'), 'Delivered');
  await waitFor(() => expect(api.profitabilityReport).toHaveBeenLastCalledWith(expect.objectContaining({ customerId: 'cust-1', partnerCode: 'MOCK_A', shipmentStatus: 'Delivered' }), expect.anything()));
});

test('exports the currently displayed report as CSV without changing report data', async () => {
  const create = jest.fn(() => 'blob:dummy');
  const revoke = jest.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<ProfitabilityReports />);
  await screen.findByText('Confirmed gross profit');
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
  expect(create).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalled();
  expect(await screen.findByRole('status')).toHaveTextContent('CSV export prepared');
  click.mockRestore();
});

test('exports Excel and PDF with the same date, customer, courier and status filters as the report', async () => {
  const create = jest.fn(() => 'blob:financial-export');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  api.profitabilityExport.mockResolvedValue({ blob: new Blob(['mock file']), filename: 'profitability-2026-10.xlsx' });
  render(<ProfitabilityReports />);
  await screen.findByText('Confirmed gross profit');
  fireEvent.change(screen.getByLabelText('Report date basis'), { target: { value: 'CUSTOM' } });
  fireEvent.change(screen.getByLabelText('Report from date'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Report to date'), { target: { value: '2026-10-31' } });
  await screen.findByRole('option', { name: 'Dummy Customer' });
  await userEvent.selectOptions(screen.getByLabelText('Report customer'), 'cust-1');
  await userEvent.selectOptions(screen.getByLabelText('Report courier'), 'MOCK_A');
  await userEvent.selectOptions(screen.getByLabelText('Report shipment status'), 'Delivered');
  await waitFor(() => expect(api.profitabilityReport).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-31', customerId: 'cust-1', partnerCode: 'MOCK_A', shipmentStatus: 'Delivered' }), expect.anything()));

  fireEvent.click(screen.getByRole('button', { name: 'Export Excel (.xlsx)' }));
  await waitFor(() => expect(api.profitabilityExport).toHaveBeenLastCalledWith('xlsx', expect.objectContaining({ from: '2026-10-01', to: '2026-10-31', customerId: 'cust-1', partnerCode: 'MOCK_A', shipmentStatus: 'Delivered' }), expect.any(AbortSignal)));
  fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
  await waitFor(() => expect(api.profitabilityExport).toHaveBeenLastCalledWith('pdf', expect.objectContaining({ from: '2026-10-01', to: '2026-10-31', customerId: 'cust-1', partnerCode: 'MOCK_A', shipmentStatus: 'Delivered' }), expect.any(AbortSignal)));
  expect(create).toHaveBeenCalledTimes(2);
  expect(click).toHaveBeenCalledTimes(2);
  click.mockRestore();
});

test('escapes CSV fields and quotes embedded newlines and commas', () => {
  expect(buildCsv(['Name', 'Note'], [['Dummy, Account', 'line 1\nline 2']])).toBe('Name,Note\r\n"Dummy, Account","line 1\nline 2"');
});

test('neutralizes formula-leading strings but preserves numeric values', () => {
  expect(buildCsv(['a', 'b', 'c', 'd', 'e', 'f'], [['=SUM(A1)', '+cmd', '-cmd', '@cmd', '  \t=cmd', '-12.50']]))
    .toBe("a,b,c,d,e,f\r\n'=SUM(A1),'+cmd,'-cmd,'@cmd,'  \t=cmd,-12.50");
  expect(buildCsv(['positive', 'decimal', 'text', 'date'], [[12, 12.5, 'ABC-123', '2026-11-23']]))
    .toBe('positive,decimal,text,date\r\n12,12.5,ABC-123,2026-11-23');
});

test('shows courier performance from the filtered report and identifies sample records', async () => {
  api.profitabilityReport.mockResolvedValue({ data: { ...report, courierPerformance: [{ code: 'MOCK_LOCAL', name: 'Sample courier', shipmentCount: 1, deliveredCount: 0, inTransitCount: 0, exceptionCount: 0, unmappedCount: 0, sampleCount: 1 }] } });
  render(<ProfitabilityReports />);
  fireEvent.click(await screen.findByRole('button', { name: 'Courier performance' }));
  expect(screen.getByRole('columnheader', { name: 'Sample' })).toBeInTheDocument();
  expect(screen.getByText('Sample courier')).toBeInTheDocument();
  expect(screen.getByText(/Unmapped statuses and sample shipments/)).toBeInTheDocument();
});

test('cancels an in-progress report download when the active filters change', async () => {
  let finishExport;
  api.profitabilityExport.mockImplementationOnce(() => new Promise(resolve => { finishExport = resolve; }));
  render(<ProfitabilityReports />);
  const button = await screen.findByRole('button', { name: 'Export Excel (.xlsx)' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  const signal = api.profitabilityExport.mock.calls.at(-1)[2];
  expect(signal.aborted).toBe(false);
  fireEvent.change(screen.getByLabelText('Report date basis'), { target: { value: 'CUSTOM' } });
  await waitFor(() => expect(signal.aborted).toBe(true));
  finishExport({ blob: new Blob(['stale']), filename: 'old.xlsx' });
  expect(screen.queryByText(/XLSX export prepared/)).not.toBeInTheDocument();
});
