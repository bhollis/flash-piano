import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';

// TODO: connect/disconnect midi on page visibility / focus

/**
 * Listen for midi notes from connected midi devices. Returns a function to initialize the midi
 * connection (should be started on focus or click) and a list of connected device names.
 */
export function useMidi(
  onKeyDown: (midiNote: number) => void,
  onKeyUp: (midiNote: number) => void,
) {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | undefined>();
  const [midiDeviceNames, setMidiDeviceNames] = useState<string[]>([]);

  const initMidi = useMemo(() => {
    let memoValue: Promise<MIDIAccess> | undefined;

    return async () => {
      if (memoValue !== undefined) {
        return memoValue;
      }

      memoValue = new Promise((resolve, reject) =>
        navigator.requestMIDIAccess().then(resolve, reject),
      );

      return memoValue;
    };
  }, []);

  const startMidi = useCallback(async () => {
    setMidiAccess(await initMidi());
  }, [initMidi]);

  useEffect(() => {
    const currentMidi = midiAccess;
    if (!currentMidi) {
      return;
    }

    const handleMidiMessage = (message: Event & { data?: Uint8Array }) => {
      const data = message.data!;
      const signal = data[0] & 0xf0;
      const note = data[1];

      if (signal === 0x90) {
        onKeyDown(note);
      } else if (signal === 0x80) {
        onKeyUp(note);
      }
    };

    function listenToPorts(this: MIDIAccess) {
      const names: string[] = [];
      for (const input of this.inputs.values()) {
        input.addEventListener('midimessage', handleMidiMessage);
        names.push(input.name ?? 'Unknown');
      }
      setMidiDeviceNames(names);
    }

    midiAccess.addEventListener('statechange', listenToPorts);
    listenToPorts.call(midiAccess);

    return () => {
      for (const entry of currentMidi.inputs) {
        const input = entry[1];
        input.removeEventListener('midimessage', handleMidiMessage);
      }
      currentMidi.removeEventListener('statechange', listenToPorts);
    };
  });

  return [startMidi, midiDeviceNames] as const;
}
