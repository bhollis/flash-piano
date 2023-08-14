import { useSignal } from '@preact/signals';
import './Piano.css';
import { useMidi } from './midi';

// TODO: start with C
const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const noteFlat = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
interface PianoKeyData {
  // TODO: note name including sharp
  // TODO: note indexes?
  names: string[];
  /** Note name including octave and accidental */
  fullNote: string;
  /** Sharp-oriented note name, without octave */
  note: string;
  sharp: boolean;
  octave: number;
  // TODO: use midi note more places
  midiNote: number;
}
const keyboardKeys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
let localizedKeyboardKeys = keyboardKeys;
if (navigator.keyboard) {
  const keyboard = navigator.keyboard;
  keyboard.getLayoutMap().then((keyboardLayoutMap) => {
    localizedKeyboardKeys = keyboardKeys.map((k) => keyboardLayoutMap.get(`Key${k.toUpperCase()}`));
    console.log({ keyboardKeys, localizedKeyboardKeys });
  });
}

const keys: PianoKeyData[] = [];

// Assumes the keyboard starts with A0
for (let i = 0; i < 88; i++) {
  const note = notes[i % notes.length];
  const sharp = note.endsWith('#');
  const octave = Math.floor(i / 12) + 1;
  keys.push({
    fullNote: `${note}${octave}`,
    note,
    names: [...new Set([note, noteFlat[i % notes.length]])],
    sharp,
    octave,
    midiNote: i + 21,
  });
}

function keyFromKeyboardEvent(e: KeyboardEvent, currentOctave: number) {
  // Get the key given an english language keycode
  const keyName = e.code.replace('Key', '').toLowerCase();
  const index = keyboardKeys.indexOf(keyName);
  if (index >= 0) {
    // Offset the index so we start on C, not A
    const noteIndex = index + 3;
    // Allow the keys to wrap to the next octave
    const octave = currentOctave + Math.floor(noteIndex / notes.length);
    const noteName = notes[noteIndex % notes.length];
    const pianoKey = keys.find((k) => k.octave === octave && k.note === noteName);
    return pianoKey;
  }
}

function findKeyboardKey(pianoKey: PianoKeyData, currentOctave: number) {
  const offset = pianoKey.octave - currentOctave;
  const keyIndex = notes.indexOf(pianoKey.note) - 3 + offset * notes.length;
  return localizedKeyboardKeys[keyIndex];
}

export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// TODO: should each piano own an audio context or should they all share?

function makeAudio() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
  gainNode.gain.value = 0.1;

  let osc: OscillatorNode | undefined;

  return [
    function playTone(midiNote: number) {
      if (osc) {
        osc.stop();
      }
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = mtof(midiNote);
      osc.connect(gainNode);
      osc.start();
    },
    () => {
      if (osc) {
        const currentOsc = osc;
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        setTimeout(() => {
          currentOsc.stop();
          if (osc === currentOsc) {
            osc = undefined;
          }
        }, 1000);
      }
    },
  ] as const;
}

// TODO: polyphony, sampling, start on focus
const [playTone, stopTone] = makeAudio();

export default function Piano() {
  // TODO: these could just be midi notes?
  const pressedKeys = useSignal<number[]>([]);
  // This is the octave the keyboard keys are aligned with
  const octave = useSignal(4);
  const showNoteNames = useSignal(true);
  const showKeyboardMapping = useSignal(true);
  // highlight?: Scale | Chord;

  const handleKeyDown = (midiNote: number) => {
    if (!pressedKeys.value.includes(midiNote)) {
      pressedKeys.value = [...pressedKeys.value, midiNote];
      playTone(midiNote);
    }
  };

  const handleKeyUp = (midiNote: number) => {
    pressedKeys.value = pressedKeys.value.filter((k) => k !== midiNote);
    stopTone();
  };

  const [startMidi, midiDeviceNames] = useMidi(handleKeyDown, handleKeyUp);

  const handleKeyboardKeyDown = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyDown(pianoKey.midiNote);
    }
  };

  const handleKeyboardKeyUp = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyUp(pianoKey.midiNote);
    }
  };

  const handleFocus = () => {
    startMidi();
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyboardKeyDown}
      onKeyUp={handleKeyboardKeyUp}
      onFocus={handleFocus}
    >
      <div className="keyboard">
        {keys.map((key) => (
          <Key
            key={key.note}
            keyboardKey={showKeyboardMapping ? findKeyboardKey(key, octave.value) : undefined}
            noteNames={showNoteNames ? key.names : undefined}
            pressed={pressedKeys.value.includes(key.midiNote)}
            black={key.sharp}
            onKeyDown={() => handleKeyDown(key.midiNote)}
            onKeyUp={() => handleKeyUp(key.midiNote)}
          />
        ))}
      </div>
      <div>
        {JSON.stringify({
          pressedKeys: pressedKeys.value,
          octave: octave.value,
          showNoteNames: showNoteNames.value,
          showKeyboardMapping: showKeyboardMapping.value,
        })}
      </div>
      <div>{midiDeviceNames}</div>
    </div>
  );
}

function Key({
  pressed,
  keyboardKey,
  noteNames,
  black,
  onKeyDown,
  onKeyUp,
}: {
  pressed: boolean;
  black: boolean;
  keyboardKey: string | undefined;
  noteNames: string[] | undefined;
  onKeyDown: () => void;
  onKeyUp: () => void;
}) {
  const handlePointerDown = (e: PointerEvent) => {
    (e.target! as HTMLElement).setPointerCapture(e.pointerId);
    onKeyDown();
  };
  const handlePointerUp = (e: PointerEvent) => {
    (e.target! as HTMLElement).setPointerCapture(e.pointerId);
    onKeyUp();
  };

  return (
    <div
      className={['key', black ? 'black' : 'white', pressed ? 'pressed' : undefined]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {noteNames?.map((noteName) => <div key={noteName}>{noteName}</div>)}
      <div>{keyboardKey}</div>
    </div>
  );
}
