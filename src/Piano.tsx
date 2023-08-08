import './Piano.css';

const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
interface PianoKeyData {
  baseNote: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  note: string;
  sharp: boolean;
  octave: number;
}

function makeKeys() {
  const keys: PianoKeyData[] = [];

  // Assumes the keyboard starts with A0
  for (let i = 0; i < 88; i++) {
    const note = notes[i % notes.length];
    const sharp = note.endsWith('#');
    const baseNote = note[0] as PianoKeyData['baseNote'];
    const octave = Math.floor(i / 12);
    keys.push({
      note: `${note}${octave}`,
      baseNote,
      sharp,
      octave: Math.floor(i / 12),
    });
  }

  return keys;
}

const keys = makeKeys();

export default function Piano() {
  return (
    <>
      {keys.map(({ note, sharp }) => (
        <Key key={note} black={sharp} />
      ))}
    </>
  );
}

function Key({ black }: { black: boolean }) {
  return <div className={`key ${black ? 'black' : 'white'}`}>{black ? 'Black' : 'White'}</div>;
}
