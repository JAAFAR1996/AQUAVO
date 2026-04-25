// Suppress noisy url.parse() deprecation warnings from third-party modules
const originalEmit = process.emit;
process.emit = function (name: string, data: any, ...args: any[]) {
  if (
    name === 'warning' &&
    typeof data === 'object' &&
    data.name === 'DeprecationWarning' &&
    data.message &&
    data.message.includes('url.parse')
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args] as any);
} as any;
