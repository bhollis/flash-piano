import { useEffect, useRef, useState } from 'preact/hooks';
import './Piano.css';
import { useMidi } from './midi';
import { usePiano } from './sound';

// TODO: start with C
const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const noteFlat = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
interface PianoKeyData {
  names: string[];
  /** Sharp-oriented note name, without octave */
  note: string;
  sharp: boolean;
  octave: number;
  midiNote: number;
}
const keyboardKeys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
let localizedKeyboardKeys = keyboardKeys;
if (navigator.keyboard) {
  const keyboard = navigator.keyboard;
  keyboard.getLayoutMap().then((keyboardLayoutMap) => {
    localizedKeyboardKeys = keyboardKeys.map(
      (k) => keyboardLayoutMap.get(`Key${k.toUpperCase()}`) ?? k,
    );
  });
}

const keys: PianoKeyData[] = [];

// Assumes the keyboard starts with A0
for (let i = 0; i < 88; i++) {
  const note = notes[i % notes.length];
  const sharp = note.endsWith('#');
  const octave = Math.floor(i / 12) + 1;
  keys.push({
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

export default function Piano() {
  // TODO: these could just be midi notes?
  const [pressedKeys, setPressedKeys] = useState<number[]>([]);
  // This is the octave the keyboard keys are aligned with
  const [octave, setOctave] = useState(4);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [showKeyboardMapping, setShowKeyboardMapping] = useState(true);
  const [playTone, stopTone, stopAllTones] = usePiano();

  // highlight?: Scale | Chord;

  const handleKeyDown = (midiNote: number) => {
    if (!pressedKeys.includes(midiNote)) {
      setPressedKeys([...pressedKeys, midiNote]);
      playTone(midiNote);
    }
  };

  const handleKeyUp = (midiNote: number) => {
    setPressedKeys((pressedKeys) => pressedKeys.filter((k) => k !== midiNote));
    stopTone(midiNote);
  };

  const [startMidi, stopMidi, midiDeviceNames] = useMidi(handleKeyDown, handleKeyUp);

  const handleKeyboardKeyDown = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave);
    if (pianoKey) {
      handleKeyDown(pianoKey.midiNote);
    }
  };

  const handleKeyboardKeyUp = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave);
    if (pianoKey) {
      handleKeyUp(pianoKey.midiNote);
    }
  };

  const handleFocus = () => {
    startMidi();
  };

  const handleBlur = () => {
    stopMidi();
    setPressedKeys([]);
    stopAllTones();
  };

  // Center the keyboard
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current
        .querySelector('* > div:nth-child(46)')
        ?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    }
  }, []);

  return (
    <div
      tabIndex={0}
      role="application"
      onKeyDown={handleKeyboardKeyDown}
      onKeyUp={handleKeyboardKeyUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="keyboard" ref={ref}>
        {keys.map((key) => (
          <Key
            key={key.note}
            keyboardKey={showKeyboardMapping ? findKeyboardKey(key, octave) : undefined}
            noteNames={showNoteNames ? key.names : undefined}
            pressed={pressedKeys.includes(key.midiNote)}
            black={key.sharp}
            onKeyDown={() => handleKeyDown(key.midiNote)}
            onKeyUp={() => handleKeyUp(key.midiNote)}
          />
        ))}
      </div>
      <div className="buttons">
        <button type="button" onClick={() => setShowKeyboardMapping((s) => !s)}>
          Toggle Keyboard Keys
        </button>
        <button type="button" onClick={() => setShowNoteNames((s) => !s)}>
          Toggle Note Names
        </button>
        <button type="button" onClick={() => setOctave((s) => Math.min(7, s + 1))}>
          Octave Up
        </button>
        <button type="button" onClick={() => setOctave((s) => Math.max(0, s - 1))}>
          Octave Down
        </button>
        {midiDeviceNames.length > 0 && <div>Connected MIDI Devices: {midiDeviceNames}</div>}
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
    >
      <div onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        {keyboardKey && <div className="keyhint">{keyboardKey}</div>}
        {noteNames?.map((noteName) => (
          <div className="keyhint" key={noteName}>
            {noteName.replace('b', '♭').replace('#', '♯')}
          </div>
        ))}
      </div>
    </div>
  );
}
