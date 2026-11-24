import { fireEvent, render, screen } from '@testing-library/react';
import ReverseOrdersPage from './ReverseOrdersPage';
import { api } from '../../services/api';
jest.mock('../../services/api', () => ({ api: { reverseOrders: jest.fn(), createReverseOrder: jest.fn(), lookupOriginalShipment: jest.fn(), products: jest.fn() }, unwrap: v => v?.data || v }));
beforeEach(() => { api.reverseOrders.mockResolvedValue({ data: { reverseOrders: [] } }); window.alert = jest.fn(); window.confirm = jest.fn(() => true); });
afterEach(() => jest.clearAllMocks());
function openForm() { render(<ReverseOrdersPage notify={jest.fn()} warehouses={[]} />); fireEvent.click(screen.getByRole('button', { name: /create reverse order/i })); return screen.getByRole('button', { name: /create & manifest reverse order/i }).closest('form'); }
test('loads existing reverse orders', async () => { api.reverseOrders.mockResolvedValue({ data: { reverseOrders: [{ waybill: 'RWB-1', customer: 'Customer', status: 'Ready for Pickup' }] } }); render(<ReverseOrdersPage notify={jest.fn()} warehouses={[]}/>); expect(await screen.findByText('RWB-1')).toBeInTheDocument(); });
test('required validation blocks incomplete submission', () => { const node = openForm(); fireEvent.submit(node); expect(window.alert).toHaveBeenCalledWith('Enter an Order ID.'); expect(api.createReverseOrder).not.toHaveBeenCalled(); });
test('confirmation is required before submission', () => { const node = openForm(); fireEvent.change(node.querySelector('input'), { target: { value: 'ORD-1' } }); fireEvent.submit(node); expect(window.confirm).not.toHaveBeenCalled(); expect(api.createReverseOrder).not.toHaveBeenCalled(); });
