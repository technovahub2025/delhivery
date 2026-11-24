import { act, renderHook, waitFor } from '@testing-library/react';
import { api } from '../services/api';
import useSavedWarehouses from './useSavedWarehouses';

jest.mock('../services/api', () => ({
  api: { getWarehouses: jest.fn() },
  unwrap: (value) => value.data ?? value,
}));

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

const mongoRecord = {
  _id: 'mongo-warehouse-1',
  name: 'Main hub',
  details: { address: 'First road', pin: '110001', registered_name: 'Main Store', phone: '9876543210' },
  registrationStatus: 'REGISTERED',
};

test('loads owner warehouse records from the authenticated backend response and maps MongoDB IDs', async () => {
  api.getWarehouses.mockResolvedValue({ success: true, data: { warehouses: [mongoRecord] } });
  const { result } = renderHook(() => useSavedWarehouses('session-token'));
  await waitFor(() => expect(result.current.warehouseLoading).toBe(false));
  expect(api.getWarehouses).toHaveBeenCalledTimes(1);
  expect(result.current.warehouses).toEqual([expect.objectContaining({
    id: 'mongo-warehouse-1', name: 'Main hub', address: 'First road', pincode: '110001',
    registered_name: 'Main Store', registrationStatus: 'REGISTERED',
  })]);
});

test('refresh after a successful update replaces the list with current backend data', async () => {
  api.getWarehouses
    .mockResolvedValueOnce({ data: { warehouses: [mongoRecord] } })
    .mockResolvedValueOnce({ data: { warehouses: [{ ...mongoRecord, details: { ...mongoRecord.details, address: 'Updated road' } }] } });
  const { result } = renderHook(() => useSavedWarehouses('session-token'));
  await waitFor(() => expect(result.current.warehouseLoading).toBe(false));
  await act(async () => { await result.current.reloadWarehouses(); });
  expect(api.getWarehouses).toHaveBeenCalledTimes(2);
  expect(result.current.warehouses[0].address).toBe('Updated road');
});

test('reports backend load errors without falling back to browser records', async () => {
  localStorage.setItem('delhivery:warehouses:v1:legacy-account', JSON.stringify([{ id: 1, name: 'Legacy', registrationStatus: 'REGISTERED' }]));
  api.getWarehouses.mockRejectedValue(new Error('Warehouse service unavailable'));
  const { result } = renderHook(() => useSavedWarehouses('session-token'));
  await waitFor(() => expect(result.current.warehouseError).toBe('Warehouse service unavailable'));
  expect(result.current.warehouses).toEqual([]);
  expect(result.current.legacyWarehousesDetected).toBe(true);
});

test('legacy localStorage entries are detected for notice only and never trusted as registered', async () => {
  localStorage.setItem('delhivery:warehouses:v1:legacy-account', JSON.stringify([{ id: 'old', name: 'Legacy Hub', registrationStatus: 'REGISTERED' }]));
  api.getWarehouses.mockResolvedValue({ data: { warehouses: [] } });
  const { result } = renderHook(() => useSavedWarehouses('session-token'));
  await waitFor(() => expect(result.current.warehouseLoading).toBe(false));
  expect(result.current.legacyWarehousesDetected).toBe(true);
  expect(result.current.warehouses).toEqual([]);
});

test('ignores malformed backend records rather than assigning a local ID', async () => {
  api.getWarehouses.mockResolvedValue({ data: { warehouses: [{ name: 'No Mongo ID' }] } });
  const { result } = renderHook(() => useSavedWarehouses('session-token'));
  await waitFor(() => expect(result.current.warehouseError).toMatch(/invalid warehouse record/i));
  expect(result.current.warehouses).toEqual([]);
});
