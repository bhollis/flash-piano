interface Navigator {
  keyboard: {
    getLayoutMap: () => Promise<Map<string, string>>;
  };
}

interface Window {
  webkitAudioContext: Window['AudioContext'];
}
