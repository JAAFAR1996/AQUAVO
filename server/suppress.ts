// Suppress noisy url.parse() deprecation warnings from third-party modules
const originalEmitWarning = process.emitWarning;

process.emitWarning = function(warning: string | Error, ...args: any[]) {
  if (typeof warning === 'string' && warning.includes('url.parse')) {
    return;
  }
  if (warning instanceof Error && warning.message.includes('url.parse')) {
    return;
  }
  return originalEmitWarning.apply(process, [warning, ...args] as any);
};

// Remove default listeners and filter
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse')) {
    return;
  }
  console.warn(`[${warning.name}] ${warning.message}`);
});
