import type { PhaseEnd } from './session';

const mockNativeModule = jest.fn<unknown, [string]>(() => null);
const mockImportNotifications = jest.fn();
const mockNotifications = {
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
};

jest.mock('expo', () => ({ requireOptionalNativeModule: (name: string) => mockNativeModule(name) }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => { mockImportNotifications(); return mockNotifications; });
jest.mock('@/features/audio/playChime', () => ({ playChime: jest.fn() }));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockNativeModule.mockReturnValue(null);
  mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });
  mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });
});

const futureEnd = (): PhaseEnd => ({ endedAt: Date.now() + 60_000,
  ended: { phase: 'focus', completedBlocks: 0, totalBlocks: 1 }, next: null });

it('loads the timer safely in Expo Go without importing the missing native notification module', async () => {
  const notifications = jest.requireActual<typeof import('./notifications')>('./notifications');
  expect(mockImportNotifications).not.toHaveBeenCalled();
  await expect(notifications.getNotificationPermission()).resolves.toBe('unsupported');
  await expect(notifications.requestNotificationPermission()).resolves.toBe('unsupported');
  await expect(notifications.scheduleTimerNotifications([futureEnd()])).resolves.toBeUndefined();
  await expect(notifications.cancelTimerNotifications()).resolves.toBeUndefined();
  expect(mockImportNotifications).not.toHaveBeenCalled();
});

it('schedules local timer notifications when the native module and permission are available', async () => {
  mockNativeModule.mockReturnValue({});
  const notifications = jest.requireActual<typeof import('./notifications')>('./notifications');
  expect(mockImportNotifications).not.toHaveBeenCalled();
  const end = futureEnd();
  await notifications.scheduleTimerNotifications([end]);
  expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('timer', { name: 'Timer', importance: 4 });
  expect(mockNotifications.setNotificationHandler).toHaveBeenCalled();
  expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    trigger: { type: 'date', date: end.endedAt, channelId: 'timer' },
  }));
  expect(await notifications.getNotificationPermission()).toBe('granted');
});

it('does not schedule notifications without permission, and cancels only timer notifications', async () => {
  mockNativeModule.mockReturnValue({});
  mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });
  const notifications = jest.requireActual<typeof import('./notifications')>('./notifications');
  await notifications.scheduleTimerNotifications([futureEnd()]);
  expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  // Cancelling the timer removes only timer notifications; Planner session reminders stay.
  mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([{ identifier: 'timer:0' }, { identifier: 'reminder:abc' }]);
  await notifications.cancelTimerNotifications();
  expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('timer:0');
  expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('reminder:abc');
});
