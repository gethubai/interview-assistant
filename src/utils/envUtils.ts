// TODO: Replace this when I implement the environment service on appContext
const isWindows = () => navigator.platform === 'Win32';
const isMacOS = () => navigator.platform.toLowerCase().includes('mac');

export { isWindows, isMacOS };
