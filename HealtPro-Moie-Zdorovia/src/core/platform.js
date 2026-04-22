export function createPlatform() {
  const cap = window.Capacitor;
  const isNative = Boolean(cap?.isNativePlatform?.());

  return {
    isNative,
    async share(options) {
      if (isNative && cap?.Plugins?.Share?.share) {
        return cap.Plugins.Share.share(options);
      }
      return null;
    },
  };
}
