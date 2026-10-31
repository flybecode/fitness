// Trainingsplan-Vorlagen. Jede Übung: [Übungs-ID, Sätze, Wiederholungen, Pause in Sekunden].

export const TEMPLATES = [
  {
    id: 'gk-ab',
    name: 'Ganzkörper A/B',
    hint: '2–3× pro Woche, ideal für den Einstieg',
    days: [
      { name: 'Ganzkörper A', ex: [['kniebeuge', 3, '6-8', 150], ['bankdruecken', 3, '6-8', 150], ['rudern-lh', 3, '8-10', 120], ['seitheben', 3, '12-15', 60], ['plank', 3, '30-45', 60]] },
      { name: 'Ganzkörper B', ex: [['rdl', 3, '8-10', 150], ['schulterdruecken-kh', 3, '8-10', 120], ['latzug', 3, '8-12', 120], ['ausfallschritt', 3, '10-12', 90], ['bizeps-kh', 2, '10-12', 60], ['trizeps-kabel', 2, '10-12', 60]] },
    ],
  },
  {
    id: 'ok-uk',
    name: 'Oberkörper / Unterkörper',
    hint: '4× pro Woche, für Fortgeschrittene',
    days: [
      { name: 'Oberkörper', ex: [['bankdruecken', 4, '6-8', 150], ['rudern-lh', 4, '6-8', 150], ['schulterdruecken-kh', 3, '8-10', 120], ['latzug', 3, '8-12', 90], ['bizeps-kh', 2, '10-12', 60], ['french-press', 2, '10-12', 60]] },
      { name: 'Unterkörper', ex: [['kniebeuge', 4, '6-8', 180], ['rdl', 3, '8-10', 150], ['bulgarian', 3, '8-10', 90], ['beinstrecker', 2, '12-15', 60], ['wadenheben', 3, '12-15', 60], ['kabelcrunch', 3, '12-15', 60]] },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Beine',
    hint: '3–6× pro Woche, viel Volumen pro Muskel',
    days: [
      { name: 'Push', ex: [['bankdruecken', 4, '6-8', 150], ['schraegbank-kh', 3, '8-12', 120], ['schulterdruecken-kh', 3, '8-10', 120], ['seitheben', 3, '12-15', 60], ['trizeps-kabel', 3, '10-12', 60]] },
      { name: 'Pull', ex: [['klimmzug', 3, '6-10', 150], ['rudern-kh', 3, '8-12', 90], ['kabelrudern', 3, '10-12', 90], ['facepull', 3, '12-15', 60], ['sz-curls', 3, '8-12', 60], ['hammercurls', 2, '10-12', 60]] },
      { name: 'Beine', ex: [['kniebeuge', 4, '6-8', 180], ['rdl', 3, '8-10', 150], ['beinpresse', 3, '10-12', 120], ['beinbeuger', 3, '10-12', 60], ['wadenheben', 3, '12-15', 60], ['beinheben', 3, '10-15', 60]] },
    ],
  },
];
