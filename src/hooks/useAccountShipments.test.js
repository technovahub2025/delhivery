import { act, renderHook, waitFor } from '@testing-library/react';
import useAccountShipments from './useAccountShipments';
import { api } from '../services/api';

jest.mock('../services/api', () => ({ api: { shipments: jest.fn() }, unwrap: (x) => x.data ?? x }));
const page = (shipments, total = shipments.length, number = 1) => ({
  shipments,
  total,
  page: number,
  limit: 100,
});
const record = (id, date = '2026-09-01') => ({ id, date, status: 'Delivered' });
beforeEach(() => jest.resetAllMocks());

test('waits for login and collects all pages before publishing recent records', async () => {
  const setter = jest.fn();
  api.shipments
    .mockResolvedValueOnce(page([record('1')], 2))
    .mockResolvedValueOnce(page([record('2', '2026-09-02')], 2, 2));
  const { result, rerender } = renderHook(({ token }) => useAccountShipments(token, setter), {
    initialProps: { token: null },
  });
  expect(api.shipments).not.toHaveBeenCalled();
  rerender({ token: 'session' });
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(api.shipments).toHaveBeenNthCalledWith(
    2,
    { page: 2, limit: 100 },
    expect.any(AbortSignal)
  );
  expect(setter).toHaveBeenCalledTimes(1);
  expect(setter.mock.calls[0][0].map((s) => s.id)).toEqual(['2', '1']);
});

test('unavailable is an error; retry may return a genuine empty account', async () => {
  const setter = jest.fn();
  api.shipments
    .mockRejectedValueOnce(new Error('Shipment source required'))
    .mockResolvedValueOnce(page([]));
  const { result } = renderHook(() => useAccountShipments('session', setter));
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.error).toBe('Shipment source required');
  expect(setter).not.toHaveBeenCalled();
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(setter).toHaveBeenCalledWith([]);
});

test('logout aborts the request and late results cannot overwrite the next session', async () => {
  let resolveOld;
  const setter = jest.fn();
  api.shipments
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValueOnce(page([record('new-account')]));
  const { result, rerender } = renderHook(({ token }) => useAccountShipments(token, setter), {
    initialProps: { token: 'old' },
  });
  expect(result.current.status).toBe('loading');
  const signal = api.shipments.mock.calls[0][1];
  act(() => result.current.cancel());
  rerender({ token: null });
  expect(signal.aborted).toBe(true);
  rerender({ token: 'new' });
  await waitFor(() => expect(result.current.status).toBe('success'));
  await act(async () => resolveOld(page([record('old-account')])));
  expect(setter).toHaveBeenCalledTimes(1);
  expect(setter.mock.calls[0][0][0].id).toBe('new-account');
});

test.each([
  { shipments: [], total: 2, page: 1, limit: 100 },
  page([record('1'), record('1')]),
  { shipments: [] },
])('invalid or partial data does not become an empty account: %j', async (data) => {
  const setter = jest.fn();
  api.shipments.mockResolvedValueOnce(data);
  const { result } = renderHook(() => useAccountShipments('session', setter));
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(setter).not.toHaveBeenCalled();
});
