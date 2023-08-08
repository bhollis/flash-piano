import { useSignal } from '@preact/signals';
import './Piano.css';

const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const noteFlat = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
interface PianoKeyData {
  baseNote: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  names: string[];
  note: string;
  sharp: boolean;
  octave: number;
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
  const baseNote = note[0] as PianoKeyData['baseNote'];
  const octave = Math.floor(i / 12) + 1;
  keys.push({
    note: `${note}${octave}`,
    names: [...new Set([note, noteFlat[i % notes.length]])],
    baseNote,
    sharp,
    octave,
  });
}

function keyFromKeyboardEvent(e: KeyboardEvent, currentOctave: number) {
  // Get the key given an english language keycode
  const keyName = e.code[e.code.length - 1].toLowerCase();
  const index = keyboardKeys.indexOf(keyName);
  if (index >= 0) {
    // Offset the index so we start on C, not A
    const noteIndex = index + 3;
    // Allow the keys to wrap to the next octave
    const octave = currentOctave + Math.floor(noteIndex / notes.length);
    const noteName = notes[noteIndex % notes.length];
    const pianoKey = keys.find((k) => k.octave === octave && k.baseNote === noteName);
    return pianoKey;
  }
}

function findKeyboardKey(pianoKey: PianoKeyData, currentOctave: number) {
  const offset = pianoKey.octave - currentOctave;
  const keyIndex = notes.indexOf(pianoKey.baseNote) - 3 + offset * notes.length;
  return localizedKeyboardKeys[keyIndex];
}

export default function Piano() {
  const pressedKeys = useSignal<PianoKeyData[]>([]);
  const octave = useSignal(4);
  const showNoteNames = useSignal(true);
  const showKeyboardMapping = useSignal(true);
  // highlight?: Scale | Chord;

  const handleKeyDown = (key: PianoKeyData) => {
    if (!pressedKeys.value.includes(key)) {
      pressedKeys.value = [...pressedKeys.value, key];
    }
  };

  const handleKeyUp = (key: PianoKeyData) => {
    pressedKeys.value = pressedKeys.value.filter((k) => k !== key);
  };

  const handleKeyboardKeyDown = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyDown(pianoKey);
    }
  };

  const handleKeyboardKeyUp = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyUp(pianoKey);
    }
  };

  return (
    <div tabIndex={0} onKeyDown={handleKeyboardKeyDown} onKeyUp={handleKeyboardKeyUp}>
      <div className="keyboard">
        {keys.map((key) => (
          <Key
            key={key.note}
            keyboardKey={showKeyboardMapping ? findKeyboardKey(key, octave.value) : undefined}
            noteNames={showNoteNames ? key.names : undefined}
            pressed={pressedKeys.value.includes(key)}
            black={key.sharp}
            onKeyDown={() => handleKeyDown(key)}
            onKeyUp={() => handleKeyUp(key)}
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
