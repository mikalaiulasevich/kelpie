export const StartupProcessMessages = {
  AddressUnavailable: 'Test listener has no network address.',
  ExitTimeout: 'Backend process did not exit within the test deadline.',
  StartupTimeout: 'Backend process did not become live within the test deadline.',
  PrematureExit: 'Backend process exited before becoming live.',
  RequestAcceptanceTimeout: 'Backend did not acknowledge the incomplete request.',
  SocketCloseTimeout: 'Incomplete request socket survived application shutdown.',
} as const;
