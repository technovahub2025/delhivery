import { act, renderHook } from '@testing-library/react';
import useSavedWarehouses from './useSavedWarehouses';

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());
const hub = { id: 1, name: 'Main hub', address: 'First road' };

test('isolates accounts, keeps saved records after logout, and ignores late writes', () => {
  const { result, rerender } = renderHook((user) => useSavedWarehouses(user), {
    initialProps: { id: 'a' },
  });
  act(() => result.current.setWarehouses([hub]));
  const oldSetter = result.current.setWarehouses;
  act(() => result.current.reset());
  rerender(null);
  expect(result.current.warehouses).toEqual([]);
  rerender({ id: 'b' });
  act(() => oldSetter([{ id: 2, name: 'Late warehouse' }]));
  expect(result.current.warehouses).toEqual([]);
  rerender({ id: 'a' });
  expect(result.current.warehouses).toEqual([hub]);
});

test('handles corrupt storage and reports failed persistence without losing accepted records', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('{broken');
  const { result } = renderHook(() => useSavedWarehouses({ id: 'a' }));
  expect(result.current.warehouses).toEqual([]);
  expect(result.current.warehouseError).toMatch(/could not be loaded/);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
  act(() => result.current.setWarehouses([hub]));
  expect(result.current.warehouses).toEqual([hub]);
  expect(result.current.warehouseError).toMatch(/could not remember/);
});
