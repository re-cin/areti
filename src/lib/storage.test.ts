import Storage from 'expo-sqlite/kv-store';
import { deviceStorage } from './storage';

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: jest.fn(), setItemSync: jest.fn(), removeItemSync: jest.fn(),
} }));

const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  jest.clearAllMocks();
  (Storage.getItemSync as jest.Mock).mockImplementation(key => values.get(key) ?? null);
  (Storage.setItemSync as jest.Mock).mockImplementation((key, value) => values.set(key, value));
  (Storage.removeItemSync as jest.Mock).mockImplementation(key => values.delete(key));
});

it('reads previously persisted auth values without using prepareAsync', async () => {
  values.set('session', 'existing-session');
  await expect(deviceStorage.getItem('session')).resolves.toBe('existing-session');
  await expect(deviceStorage.getItem('missing')).resolves.toBeNull();
});

it('persists and removes auth values and sync cursors through the same KV store', async () => {
  await deviceStorage.setItem('cursor', '123');
  expect(Storage.setItemSync).toHaveBeenCalledWith('cursor', '123');
  expect(await deviceStorage.getItem('cursor')).toBe('123');
  await deviceStorage.removeItem('cursor');
  expect(await deviceStorage.getItem('cursor')).toBeNull();
});

it('rejects a failed storage operation instead of silently reporting success', async () => {
  (Storage.setItemSync as jest.Mock).mockImplementation(() => { throw new Error('Storage unavailable'); });
  await expect(deviceStorage.setItem('session', 'value')).rejects.toThrow('Storage unavailable');
});
