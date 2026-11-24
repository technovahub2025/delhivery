import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '../../services/api';
import DemoWalkInPayments from './DemoWalkInPayments';

jest.mock('../../services/api', () => ({ api: { demoWalkInPayments: jest.fn(), recordDemoWalkInPayment: jest.fn(), recordManualWalkInReceipt: jest.fn() }, unwrap: value => value?.data ?? value }));

test('records a demo-only receipt and shows the persisted method returned by the API', async () => {
  api.demoWalkInPayments.mockResolvedValue({ demoAvailable: true, methods: ['CASH', 'UPI'], shipments: [{ id: 'demo-1', reference: 'SAMPLE-1', amount: '25', currency: 'INR' }] });
  api.recordDemoWalkInPayment.mockResolvedValue({ receipt: { method: 'UPI', source: 'DEMO_ONLY' } });
  render(<DemoWalkInPayments />);
  const button = await screen.findByRole('button', { name: 'Record demo receipt' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Sample payment method' }), { target: { value: 'UPI' } });
  fireEvent.click(button);
  expect(await screen.findByText('Demo receipt recorded via UPI')).toBeInTheDocument();
  expect(api.recordDemoWalkInPayment).toHaveBeenCalledWith('demo-1', 'UPI');
  expect(screen.queryByRole('button', { name: 'Record demo receipt' })).not.toBeInTheDocument();
});

test('records a reference for a configured manual receipt without using the demo action', async () => {
  jest.clearAllMocks();
  api.demoWalkInPayments.mockResolvedValue({ demoAvailable: true, methods: [], shipments: [], manual: { methods: ['CASH'], shipments: [{ id: 'ship-1', reference: 'ORDER-1', amount: '75', currency: 'INR' }] } });
  api.recordManualWalkInReceipt.mockResolvedValue({ receipt: { method: 'CASH', reference: 'Receipt-1', source: 'MANUAL_RECEIPT' } });
  render(<DemoWalkInPayments />);
  const button = await screen.findByRole('button', { name: 'Record receipt' });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Receipt reference for ORDER-1'), { target: { value: 'Receipt-1' } });
  fireEvent.click(button);
  expect(await screen.findByText('Receipt recorded via CASH (Receipt-1)')).toBeInTheDocument();
  expect(api.recordManualWalkInReceipt).toHaveBeenCalledWith('ship-1', 'CASH', 'Receipt-1');
  expect(api.recordDemoWalkInPayment).not.toHaveBeenCalled();
});

test('hides demo payments when the backend capability is disabled', async () => {
  jest.clearAllMocks();
  api.demoWalkInPayments.mockResolvedValue({ demoAvailable: false, methods: ['CASH'], shipments: [{ id: 'x' }] });
  render(<DemoWalkInPayments />);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Record demo receipt' })).not.toBeInTheDocument());
});
