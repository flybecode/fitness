// Übungsbibliothek. inc: übliche Gewichtssteigerung in kg, bw: Körpergewichtsübung,
// timed: Wiederholungen werden als Sekunden gezählt.

export const MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Beine', 'Po', 'Bizeps', 'Trizeps', 'Bauch', 'Sonstige'];

export const EXERCISES = [
  { id: 'bankdruecken', name: 'Bankdrücken (Langhantel)', muscle: 'Brust', inc: 2.5 },
  { id: 'kh-bankdruecken', name: 'Kurzhantel-Bankdrücken', muscle: 'Brust', inc: 2 },
  { id: 'schraegbank-kh', name: 'Schrägbankdrücken (Kurzhantel)', muscle: 'Brust', inc: 2 },
  { id: 'butterfly', name: 'Butterfly (Maschine)', muscle: 'Brust', inc: 2.5 },
  { id: 'liegestuetz', name: 'Liegestütze', muscle: 'Brust', bw: true },
  { id: 'dips', name: 'Dips', muscle: 'Brust', bw: true, inc: 2.5 },

  { id: 'klimmzug', name: 'Klimmzüge', muscle: 'Rücken', bw: true, inc: 2.5 },
  { id: 'latzug', name: 'Latzug', muscle: 'Rücken', inc: 2.5 },
  { id: 'rudern-lh', name: 'Langhantelrudern', muscle: 'Rücken', inc: 2.5 },
  { id: 'rudern-kh', name: 'Kurzhantelrudern einarmig', muscle: 'Rücken', inc: 2 },
  { id: 'kabelrudern', name: 'Rudern am Kabel (sitzend)', muscle: 'Rücken', inc: 2.5 },
  { id: 'kreuzheben', name: 'Kreuzheben', muscle: 'Rücken', inc: 5 },

  { id: 'schulterdruecken-kh', name: 'Schulterdrücken (Kurzhantel)', muscle: 'Schultern', inc: 2 },
  { id: 'ohp', name: 'Überkopfdrücken (Langhantel)', muscle: 'Schultern', inc: 2.5 },
  { id: 'seitheben', name: 'Seitheben', muscle: 'Schultern', inc: 1 },
  { id: 'facepull', name: 'Face Pulls', muscle: 'Schultern', inc: 2.5 },
  { id: 'reverse-fly', name: 'Reverse Flys', muscle: 'Schultern', inc: 1 },

  { id: 'kniebeuge', name: 'Kniebeugen (Langhantel)', muscle: 'Beine', inc: 2.5 },
  { id: 'goblet', name: 'Goblet Squats', muscle: 'Beine', inc: 2 },
  { id: 'beinpresse', name: 'Beinpresse', muscle: 'Beine', inc: 5 },
  { id: 'rdl', name: 'Rumänisches Kreuzheben', muscle: 'Beine', inc: 2.5 },
  { id: 'ausfallschritt', name: 'Ausfallschritte (Kurzhantel)', muscle: 'Beine', inc: 2 },
  { id: 'bulgarian', name: 'Bulgarian Split Squats', muscle: 'Beine', inc: 2 },
  { id: 'beinstrecker', name: 'Beinstrecker', muscle: 'Beine', inc: 2.5 },
  { id: 'beinbeuger', name: 'Beinbeuger', muscle: 'Beine', inc: 2.5 },
  { id: 'wadenheben', name: 'Wadenheben', muscle: 'Beine', inc: 5 },
  { id: 'hip-thrust', name: 'Hip Thrusts', muscle: 'Po', inc: 5 },

  { id: 'bizeps-kh', name: 'Bizepscurls (Kurzhantel)', muscle: 'Bizeps', inc: 1 },
  { id: 'hammercurls', name: 'Hammercurls', muscle: 'Bizeps', inc: 1 },
  { id: 'sz-curls', name: 'SZ-Curls', muscle: 'Bizeps', inc: 2.5 },
  { id: 'trizeps-kabel', name: 'Trizepsdrücken am Kabel', muscle: 'Trizeps', inc: 2.5 },
  { id: 'french-press', name: 'French Press (SZ)', muscle: 'Trizeps', inc: 2.5 },
  { id: 'trizeps-ueberkopf', name: 'Trizeps über Kopf (Kurzhantel)', muscle: 'Trizeps', inc: 2 },

  { id: 'plank', name: 'Unterarmstütz (Plank)', muscle: 'Bauch', bw: true, timed: true },
  { id: 'kabelcrunch', name: 'Crunches am Kabel', muscle: 'Bauch', inc: 2.5 },
  { id: 'beinheben', name: 'Beinheben hängend', muscle: 'Bauch', bw: true },
];
