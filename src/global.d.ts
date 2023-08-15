interface Navigator {
  keyboard: {
    getLayoutMap: () => Promise<Map<string, string>>;
  };
}

interface Window {
  webkitAudioContext: Window['AudioContext'];
}

declare module '*.css' {
  const value: string;
  export default value;
}
