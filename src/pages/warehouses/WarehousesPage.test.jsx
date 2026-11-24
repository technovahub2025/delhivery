import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import WarehousesPage from './WarehousesPage';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: { createWarehouse: jest.fn(), updateWarehouse: jest.fn() } }));

afterEach(() => jest.clearAllMocks());

test.each([
  ['REGISTERED', 'Registered · ready for booking', 'Registration confirmed'],
  ['CREATING', 'Pending registration', 'Not ready for booking'],
  ['PENDING', 'Pending registration', 'Not ready for booking'],
  ['FAILED', 'Registration failed', 'Not ready for booking'],
  ['OUTCOME_UNCONFIRMED', 'Outcome needs verification', 'Not ready for booking'],
])('shows %s registration state and booking readiness accurately', (registrationStatus, label, readiness) => {
  render(<WarehousesPage warehouses={[{
    id: 'mongo-1', name: 'Test Hub', address: 'Test Road', pincode: '110001', contact: 'Manager', phone: '9876543210', registrationStatus,
  }]} />);
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText(readiness)).toBeInTheDocument();
  if (registrationStatus === 'REGISTERED') expect(screen.getByRole('button', { name: /edit warehouse/i })).toBeInTheDocument();
  else expect(screen.queryByRole('button', { name: /edit warehouse/i })).not.toBeInTheDocument();
});

test('renders loading, empty, error and legacy-data notice without trusting browser records', () => {
  const { rerender } = render(<WarehousesPage warehouses={[]} loading legacyWarehousesDetected />);
  expect(screen.getByText('Loading warehouses...')).toBeInTheDocument();
  expect(screen.getByText(/older warehouse entries were found/i)).toBeInTheDocument();
  rerender(<WarehousesPage warehouses={[]} />);
  expect(screen.getByText(/no warehouses have been registered/i)).toBeInTheDocument();
  rerender(<WarehousesPage warehouses={[]} error="Unable to load" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load');
});

test('successful create reloads MongoDB list instead of inserting a client-generated record', async () => {
  const warehouse = { _id: 'mongo-new-id', id: 'mongo-new-id', name: 'Main Hub', registrationStatus: 'REGISTERED' };
  const reloadWarehouses = jest.fn().mockResolvedValue([warehouse]);
  api.createWarehouse.mockResolvedValue({ success: true, warehouse });
  render(<WarehousesPage warehouses={[]} reloadWarehouses={reloadWarehouses} notify={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add warehouse' }));
  const formValues = [
    ['Warehouse name', 'Main Hub'], ['Contact name', 'Main Store'], ['Phone number', '9876543210'],
    ['Full address', 'First Road'], ['Pincode', '110001'], ['Registered business name', 'Main Store Pvt Ltd'],
    ['Email address', 'hub@example.com'], ['City', 'Delhi'], ['State', 'Delhi'],
  ];
  formValues.forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add warehouse' }));
  await waitFor(() => expect(reloadWarehouses).toHaveBeenCalledTimes(1));
  expect(api.createWarehouse).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: 'Main Hub' })).not.toBeInTheDocument();
});

test('successful edit refreshes the owner warehouse list from the backend', async () => {
  const warehouse = { _id: 'mongo-existing-id', id: 'mongo-existing-id', name: 'Main Hub', registrationStatus: 'REGISTERED' };
  const reloadWarehouses = jest.fn().mockResolvedValue([warehouse]);
  api.updateWarehouse.mockResolvedValue({ success: true, warehouse });
  render(<WarehousesPage warehouses={[{
    id: warehouse.id, name: warehouse.name, address: 'First Road', pincode: '110001', contact: 'Main Store', phone: '9876543210', registrationStatus: 'REGISTERED',
  }]} reloadWarehouses={reloadWarehouses} notify={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /edit warehouse/i }));
  const values = [
    ['Warehouse name', 'Main Hub'], ['Contact name', 'Main Store'], ['Phone number', '9876543210'],
    ['Full address', 'Updated Road'], ['Pincode', '110001'], ['Registered business name', 'Main Store Pvt Ltd'],
    ['Email address', 'hub@example.com'], ['City', 'Delhi'], ['State', 'Delhi'],
  ];
  values.forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updateWarehouse).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(reloadWarehouses).toHaveBeenCalledTimes(1));
});
