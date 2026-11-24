import { act, renderHook, waitFor } from '@testing-library/react';
import { api } from '../services/api';
import useDemoWorkspace from './useDemoWorkspace';

beforeEach(() => {
  jest.spyOn(api, 'bookDraftShipment');
  jest.spyOn(api, 'shipmentDrafts').mockResolvedValue({ data: { drafts: [] } });
  jest.spyOn(api, 'getWarehouses').mockResolvedValue({ data: { warehouses: [] } });
  jest.spyOn(api, 'shipments').mockResolvedValue({ data: { shipments: [], total: 0, page: 1, limit: 100 } });
  jest.spyOn(api, 'pickupRequests').mockResolvedValue({ data: { pickups: [], total: 0 } });
});

afterEach(() => jest.restoreAllMocks());

test('explicit BOOKED_AWB_PENDING success refreshes shipments and drafts without inventing an AWB', async () => {
  const savedShipment = {
    id: 'BOOKED-DUMMY-1',
    reference: 'DUMMY-ORDER-1',
    providerCode: 'MOCK_LOCAL',
    mockOnly: true,
    bookingStatus: 'BOOKED_AWB_PENDING',
    waybill: '',
    status: 'Pending pickup',
    date: '2026-11-16',
  };
  api.bookDraftShipment.mockResolvedValue({
    success: true,
    data: { success: true, status: 'BOOKED_AWB_PENDING', waybillGenerated: false },
    shipment: savedShipment,
  });
  api.shipments
    .mockResolvedValueOnce({ data: { shipments: [], total: 0, page: 1, limit: 100 } })
    .mockResolvedValue({ data: { shipments: [savedShipment], total: 1, page: 1, limit: 100 } });
  api.shipmentDrafts
    .mockResolvedValueOnce({ data: { drafts: [{ id: 'draft-1', state: 'draft' }] } })
    .mockResolvedValueOnce({ data: { drafts: [] } });

  const { result } = renderHook(() => useDemoWorkspace('test-session', {}));
  await waitFor(() => expect(result.current.shipmentLoad.status).toBe('success'));
  await act(async () => { await result.current.loadShipmentDrafts(); });
  expect(result.current.shipmentDrafts).toHaveLength(1);

  let booked;
  await act(async () => { booked = await result.current.bookDraftShipment('draft-1'); });

  await waitFor(() => {
    expect(result.current.shipments).toContainEqual(savedShipment);
    expect(api.shipments).toHaveBeenCalledTimes(2);
  });
  expect(booked.bookingStatus).toBe('BOOKED_AWB_PENDING');
  expect(booked.waybill).toBe('');
  expect(result.current.shipmentDrafts).toEqual([]);
  expect(api.shipmentDrafts).toHaveBeenCalledTimes(2);
  expect(api.bookDraftShipment).toHaveBeenCalledTimes(1);
});

test('a missing AWB without explicit successful pending status remains an error and does not refresh drafts', async () => {
  api.bookDraftShipment.mockResolvedValue({
    success: true,
    data: { success: true, status: 'BOOKING_PENDING' },
    shipment: { id: 'BOOKED-DUMMY-2', waybill: '', bookingStatus: 'BOOKING_PENDING' },
  });
  const { result } = renderHook(() => useDemoWorkspace('test-session', {}));
  await waitFor(() => expect(result.current.shipmentLoad.status).toBe('success'));

  let failure;
  await act(async () => { try { await result.current.bookDraftShipment('draft-2'); } catch (error) { failure = error; } });
  expect(failure.message).toMatch(/confirmed AWB/);
  expect(api.shipmentDrafts).not.toHaveBeenCalled();
});

test('pending status without an explicit successful envelope remains an error', async () => {
  api.bookDraftShipment.mockResolvedValue({
    success: false,
    data: { status: 'BOOKED_AWB_PENDING' },
    shipment: { id: 'BOOKED-DUMMY-3', waybill: '', bookingStatus: 'BOOKED_AWB_PENDING' },
  });
  const { result } = renderHook(() => useDemoWorkspace('test-session', {}));
  await waitFor(() => expect(result.current.shipmentLoad.status).toBe('success'));

  let failure;
  await act(async () => { try { await result.current.bookDraftShipment('draft-3'); } catch (error) { failure = error; } });
  expect(failure.message).toMatch(/confirmed AWB/);
  expect(api.shipmentDrafts).not.toHaveBeenCalled();
});
