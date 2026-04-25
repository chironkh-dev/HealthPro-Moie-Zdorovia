export const isNative = () => {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  };
  
  export const getPlatform = () => {
    if (isNative()) {
      return window.Capacitor.getPlatform(); // поверне 'ios' або 'android'
    }
    return 'web';
  };