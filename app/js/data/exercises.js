// Übungsbibliothek. m: Hauptmuskeln (zählen voll), s: Hilfsmuskeln (zählen halb) für die Muskelbalance.
// inc: übliche Gewichtssteigerung in kg, bw: Körpergewicht (Gewicht = Zusatzgewicht), timed: Sekunden statt Wdh.

// Wöchentliche Satzziele pro Muskelgruppe, je nach Trainingsart:
// low = Low Volume / High Intensity (wenige, sehr harte Sätze bis zum Muskelversagen),
// high = High Volume / Low Intensity (mehr Sätze mit etwas Abstand zum Versagen).
export const MUSCLES = [
  { id: 'Brust', low: 6, high: 12 },
  { id: 'Rücken', low: 6, high: 12 },
  { id: 'Schultern', low: 5, high: 10 },
  { id: 'Bizeps', low: 4, high: 8 },
  { id: 'Trizeps', low: 4, high: 8 },
  { id: 'Quadrizeps', low: 5, high: 10 },
  { id: 'Beinbeuger', low: 4, high: 8 },
  { id: 'Po', low: 4, high: 8 },
  { id: 'Waden', low: 3, high: 6 },
  { id: 'Bauch', low: 3, high: 6 },
];

export const STYLES = {
  high: { label: 'High Volume · Low Intensity', hint: 'Mehr Sätze, meist 1–3 Wiederholungen vor dem Muskelversagen' },
  low: { label: 'Low Volume · High Intensity', hint: 'Wenige, sehr harte Sätze bis zum Muskelversagen' },
};

export const EQUIPMENT = { free: 'Freihantel', machine: 'Maschine / Kabel', bw: 'Körpergewicht' };

// Übungen an Maschinen und Kabelzügen; alles andere ohne bw ist Freihantel.
const MACHINE = new Set(['brustpresse', 'butterfly', 'kabelzug-fly', 'latzug', 'kabelrudern', 'rudern-maschine', 'schulterpresse',
  'facepull', 'hackenschmidt', 'beinpresse', 'beinstrecker', 'beinbeuger', 'abduktoren', 'trizeps-kabel', 'kabelcrunch']);

const E = (id, name, m, s = [], x = {}) => ({ id, name, m, s, inc: 2.5, eq: x.bw ? 'bw' : MACHINE.has(id) ? 'machine' : 'free', ...x });

export const EXERCISES = [
  E('bankdruecken', 'Bankdrücken (Langhantel)', ['Brust'], ['Trizeps', 'Schultern']),
  E('kh-bankdruecken', 'Kurzhantel-Bankdrücken', ['Brust'], ['Trizeps', 'Schultern'], { inc: 2 }),
  E('schraegbank-kh', 'Schrägbankdrücken (Kurzhantel)', ['Brust'], ['Schultern', 'Trizeps'], { inc: 2 }),
  E('brustpresse', 'Brustpresse (Maschine)', ['Brust'], ['Trizeps']),
  E('butterfly', 'Butterfly (Maschine)', ['Brust']),
  E('kabelzug-fly', 'Cable Flys', ['Brust']),
  E('liegestuetz', 'Liegestütze', ['Brust'], ['Trizeps', 'Schultern'], { bw: true }),
  E('dips', 'Dips', ['Brust', 'Trizeps'], ['Schultern'], { bw: true }),

  E('klimmzug', 'Klimmzüge', ['Rücken'], ['Bizeps'], { bw: true }),
  E('latzug', 'Latzug', ['Rücken'], ['Bizeps']),
  E('rudern-lh', 'Langhantelrudern', ['Rücken'], ['Bizeps', 'Schultern']),
  E('rudern-kh', 'Kurzhantelrudern einarmig', ['Rücken'], ['Bizeps'], { inc: 2 }),
  E('kabelrudern', 'Rudern am Kabel (sitzend)', ['Rücken'], ['Bizeps']),
  E('rudern-maschine', 'Rudermaschine (Brustgestützt)', ['Rücken'], ['Bizeps', 'Schultern']),
  E('kreuzheben', 'Kreuzheben', ['Rücken', 'Beinbeuger', 'Po'], ['Quadrizeps'], { inc: 5 }),

  E('schulterdruecken-kh', 'Schulterdrücken (Kurzhantel)', ['Schultern'], ['Trizeps'], { inc: 2 }),
  E('ohp', 'Überkopfdrücken (Langhantel)', ['Schultern'], ['Trizeps']),
  E('schulterpresse', 'Schulterpresse (Maschine)', ['Schultern'], ['Trizeps']),
  E('seitheben', 'Seitheben', ['Schultern'], [], { inc: 1 }),
  E('facepull', 'Face Pulls', ['Schultern'], ['Rücken']),
  E('reverse-fly', 'Reverse Flys', ['Schultern'], ['Rücken'], { inc: 1 }),

  E('kniebeuge', 'Kniebeugen (Langhantel)', ['Quadrizeps', 'Po'], ['Beinbeuger']),
  E('goblet', 'Goblet Squats', ['Quadrizeps'], ['Po'], { inc: 2 }),
  E('hackenschmidt', 'Hackenschmidt-Kniebeuge', ['Quadrizeps'], ['Po'], { inc: 5 }),
  E('beinpresse', 'Beinpresse', ['Quadrizeps'], ['Po'], { inc: 5 }),
  E('ausfallschritt', 'Ausfallschritte (Kurzhantel)', ['Quadrizeps', 'Po'], [], { inc: 2 }),
  E('bulgarian', 'Bulgarian Split Squats', ['Quadrizeps', 'Po'], [], { inc: 2 }),
  E('beinstrecker', 'Beinstrecker', ['Quadrizeps']),
  E('rdl', 'Rumänisches Kreuzheben', ['Beinbeuger', 'Po'], ['Rücken']),
  E('beinbeuger', 'Beinbeuger (Maschine)', ['Beinbeuger']),
  E('hip-thrust', 'Hip Thrusts', ['Po'], ['Beinbeuger'], { inc: 5 }),
  E('abduktoren', 'Abduktoren (Maschine)', ['Po']),
  E('wadenheben', 'Wadenheben', ['Waden'], [], { inc: 5 }),

  E('bizeps-kh', 'Bizepscurls (Kurzhantel)', ['Bizeps'], [], { inc: 1 }),
  E('hammercurls', 'Hammercurls', ['Bizeps'], [], { inc: 1 }),
  E('sz-curls', 'SZ-Curls', ['Bizeps']),
  E('scottcurls', 'Scottcurls', ['Bizeps']),
  E('trizeps-kabel', 'Trizepsdrücken am Kabel', ['Trizeps']),
  E('french-press', 'French Press (SZ)', ['Trizeps']),
  E('trizeps-ueberkopf', 'Trizeps über Kopf (Kurzhantel)', ['Trizeps'], [], { inc: 2 }),

  E('plank', 'Unterarmstütz (Plank)', ['Bauch'], [], { bw: true, timed: true, inc: 0 }),
  E('kabelcrunch', 'Crunches am Kabel', ['Bauch']),
  E('beinheben', 'Beinheben hängend', ['Bauch'], [], { bw: true, inc: 0 }),
];
