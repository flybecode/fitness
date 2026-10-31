// Rezepte für eine Grundportion. items: [Lebensmittel-ID, Gramm].
// Nährwerte werden aus foods.js berechnet und beim Planen auf den Bedarf skaliert.
// cat: fruehstueck | haupt | snack   diet: alles | veg | vegan

export const RECIPES = [
  // Frühstück
  {
    id: 'overnight-oats', name: 'Overnight Oats mit Beeren & Skyr', cat: 'fruehstueck', diet: 'veg', min: 5,
    items: [['haferflocken', 60], ['skyr', 150], ['milch', 100], ['beeren', 100], ['chiasamen', 10]],
    steps: ['Haferflocken, Chiasamen, Skyr und Milch verrühren.', 'Über Nacht im Kühlschrank quellen lassen.', 'Morgens mit den Beeren toppen.'],
  },
  {
    id: 'ruehrei-brot', name: 'Rührei mit Vollkornbrot & Tomaten', cat: 'fruehstueck', diet: 'veg', min: 10,
    items: [['ei', 180], ['vollkornbrot', 100], ['tomaten', 100], ['butter', 5]],
    extra: 'Salz, Pfeffer, Schnittlauch',
    steps: ['Eier verquirlen und würzen.', 'In der Pfanne mit etwas Butter bei mittlerer Hitze stocken lassen.', 'Mit Brot und Tomaten servieren.'],
  },
  {
    id: 'protein-porridge', name: 'Protein-Porridge mit Banane', cat: 'fruehstueck', diet: 'veg', min: 8,
    items: [['haferflocken', 70], ['milch', 250], ['whey', 25], ['banane', 120], ['erdnussbutter', 10]],
    extra: 'Zimt',
    steps: ['Haferflocken mit Milch aufkochen und 3 Min. köcheln lassen.', 'Vom Herd nehmen, Proteinpulver einrühren.', 'Mit Bananenscheiben, Erdnussbutter und Zimt toppen.'],
  },
  {
    id: 'quark-bowl', name: 'Quark-Bowl mit Beeren & Walnüssen', cat: 'fruehstueck', diet: 'veg', min: 5,
    items: [['magerquark', 250], ['beeren', 100], ['haferflocken', 30], ['walnuesse', 15], ['honig', 10]],
    steps: ['Quark mit einem Schuss Wasser cremig rühren.', 'Haferflocken, Beeren und gehackte Walnüsse darauf.', 'Mit Honig beträufeln.'],
  },
  {
    id: 'brot-huettenkaese', name: 'Vollkornbrot mit Hüttenkäse & Schinken', cat: 'fruehstueck', diet: 'alles', min: 5,
    items: [['vollkornbrot', 100], ['huettenkaese', 100], ['kochschinken', 50], ['gurke', 100]],
    extra: 'Pfeffer, Kresse',
    steps: ['Brot mit Hüttenkäse bestreichen.', 'Mit Schinken und Gurkenscheiben belegen, pfeffern.'],
  },
  {
    id: 'tofu-scramble', name: 'Tofu-Scramble mit Spinat', cat: 'fruehstueck', diet: 'vegan', min: 12,
    items: [['tofu', 150], ['spinat', 80], ['tomaten', 100], ['vollkornbrot', 50], ['olivenoel', 5]],
    extra: 'Kurkuma, Salz, Pfeffer',
    steps: ['Tofu mit der Gabel zerbröseln.', 'In Öl anbraten, mit Kurkuma, Salz und Pfeffer würzen.', 'Spinat und Tomaten kurz mitgaren, mit Brot servieren.'],
  },
  {
    id: 'skyr-pancakes', name: 'Skyr-Pancakes mit Beeren', cat: 'fruehstueck', diet: 'veg', min: 15,
    items: [['ei', 120], ['haferflocken', 50], ['skyr', 100], ['beeren', 80], ['olivenoel', 3]],
    extra: 'Backpulver, Zimt',
    steps: ['Eier, Haferflocken, Skyr und eine Prise Backpulver pürieren.', 'In einer leicht geölten Pfanne kleine Pancakes ausbacken.', 'Mit Beeren servieren.'],
  },

  // Hauptgerichte (Mittag & Abend)
  {
    id: 'haehnchen-reis-bowl', name: 'Hähnchen-Reis-Bowl mit Brokkoli', cat: 'haupt', diet: 'alles', min: 25,
    items: [['haehnchen', 150], ['reis', 75], ['brokkoli', 200], ['olivenoel', 10]],
    extra: 'Sojasauce, Knoblauch, Paprikapulver',
    steps: ['Reis nach Packung kochen.', 'Hähnchen in Würfel schneiden, würzen und in Öl goldbraun braten.', 'Brokkoli 4 Min. dämpfen.', 'Alles in einer Schüssel anrichten, mit Sojasauce abschmecken.'],
  },
  {
    id: 'bolognese', name: 'Vollkornpasta Bolognese', cat: 'haupt', diet: 'alles', min: 30,
    items: [['rinderhack', 125], ['nudeln', 90], ['passata', 200], ['zwiebel', 50], ['karotte', 50], ['parmesan', 10], ['olivenoel', 5]],
    extra: 'Knoblauch, Oregano, Salz, Pfeffer',
    steps: ['Zwiebel und Karotte fein würfeln, in Öl anschwitzen.', 'Hack krümelig mitbraten.', 'Passata dazu, würzen und 15 Min. köcheln lassen.', 'Nudeln kochen, mit Sauce und Parmesan servieren.'],
    batch: true,
  },
  {
    id: 'lachs-ofengemuese', name: 'Lachs mit Ofenkartoffeln & Gemüse', cat: 'haupt', diet: 'alles', min: 35,
    items: [['lachs', 125], ['kartoffeln', 250], ['zucchini', 150], ['paprika', 100], ['olivenoel', 5]],
    extra: 'Rosmarin, Zitrone, Salz',
    steps: ['Ofen auf 200 °C vorheizen.', 'Kartoffeln vierteln, mit Öl und Rosmarin 15 Min. backen.', 'Gemüse und Lachs dazulegen, weitere 15 Min. backen.', 'Mit Zitrone beträufeln.'],
  },
  {
    id: 'linsen-curry', name: 'Rotes Linsen-Curry mit Reis', cat: 'haupt', diet: 'vegan', min: 25,
    items: [['linsen', 80], ['kokosmilch', 100], ['passata', 150], ['spinat', 100], ['zwiebel', 50], ['reis', 50]],
    extra: 'Currypulver, Ingwer, Knoblauch',
    steps: ['Zwiebel, Ingwer und Knoblauch anschwitzen, Curry kurz mitrösten.', 'Linsen, Passata, Kokosmilch und 200 ml Wasser dazu, 12 Min. köcheln.', 'Spinat unterheben. Mit Reis servieren.'],
    batch: true,
  },
  {
    id: 'chili-con-carne', name: 'Chili con Carne', cat: 'haupt', diet: 'alles', min: 35,
    items: [['rinderhack', 125], ['kidney', 120], ['mais', 60], ['passata', 200], ['paprika', 100], ['zwiebel', 50], ['reis', 50]],
    extra: 'Chili, Kreuzkümmel, Paprikapulver',
    steps: ['Zwiebel und Hack anbraten, Gewürze kurz mitrösten.', 'Paprika, Passata, Bohnen und Mais dazu.', '20 Min. köcheln lassen, mit Reis servieren.'],
    batch: true,
  },
  {
    id: 'chili-sin-carne', name: 'Chili sin Carne', cat: 'haupt', diet: 'vegan', min: 30,
    items: [['kidney', 150], ['linsen', 40], ['mais', 80], ['passata', 200], ['paprika', 100], ['zwiebel', 50], ['reis', 50]],
    extra: 'Chili, Kreuzkümmel, Paprikapulver, Kakao',
    steps: ['Zwiebel anschwitzen, Gewürze mitrösten.', 'Linsen, Paprika, Passata und 150 ml Wasser dazu, 15 Min. köcheln.', 'Bohnen und Mais unterheben, mit Reis servieren.'],
    batch: true,
  },
  {
    id: 'puten-wrap', name: 'Puten-Wraps mit Hummus', cat: 'haupt', diet: 'alles', min: 10,
    items: [['wrap', 120], ['putenbrust', 120], ['hummus', 30], ['salat', 40], ['tomaten', 80]],
    steps: ['Putenbrust in Streifen braten (oder Aufschnitt nehmen).', 'Wraps mit Hummus bestreichen.', 'Mit Salat, Tomaten und Pute füllen und einrollen.'],
  },
  {
    id: 'thunfisch-nudelsalat', name: 'Thunfisch-Nudelsalat', cat: 'haupt', diet: 'alles', min: 15,
    items: [['nudeln', 80], ['thunfisch', 120], ['mais', 60], ['paprika', 100], ['gurke', 100], ['joghurt', 60]],
    extra: 'Zitrone, Senf, Dill',
    steps: ['Nudeln kochen und abschrecken.', 'Gemüse würfeln.', 'Joghurt mit Zitrone, Senf und Dill verrühren.', 'Alles mit dem Thunfisch mischen. Hält sich 2 Tage im Kühlschrank.'],
    batch: true,
  },
  {
    id: 'griechischer-salat', name: 'Griechischer Salat mit Hähnchen', cat: 'haupt', diet: 'alles', min: 15,
    items: [['haehnchen', 130], ['feta', 40], ['gurke', 150], ['tomaten', 150], ['paprika', 80], ['zwiebel', 30], ['olivenoel', 10], ['vollkornbrot', 50]],
    extra: 'Oregano, Zitrone',
    steps: ['Hähnchen würzen und braten, in Streifen schneiden.', 'Gemüse grob schneiden, Feta zerbröseln.', 'Mit Öl, Zitrone und Oregano anmachen, mit Brot servieren.'],
  },
  {
    id: 'tofu-pfanne', name: 'Tofu-Gemüse-Pfanne mit Reis', cat: 'haupt', diet: 'vegan', min: 25,
    items: [['tofu', 200], ['reis', 70], ['paprika', 120], ['brokkoli', 150], ['olivenoel', 10]],
    extra: 'Sojasauce, Ingwer, Sesam',
    steps: ['Reis kochen.', 'Tofu würfeln und in Öl knusprig braten.', 'Gemüse dazu und bissfest braten.', 'Mit Sojasauce und Ingwer abschmecken.'],
  },
  {
    id: 'suesskartoffel-bowl', name: 'Süßkartoffel-Kichererbsen-Bowl', cat: 'haupt', diet: 'veg', min: 30,
    items: [['suesskartoffel', 250], ['kichererbsen', 150], ['spinat', 60], ['feta', 30], ['olivenoel', 5]],
    extra: 'Paprikapulver, Kreuzkümmel, Zitrone',
    steps: ['Ofen auf 200 °C vorheizen.', 'Süßkartoffel würfeln, mit Kichererbsen, Öl und Gewürzen 25 Min. rösten.', 'Auf Spinat anrichten, Feta darüberbröseln.'],
  },
  {
    id: 'garnelen-couscous', name: 'Garnelen-Couscous mit Zucchini', cat: 'haupt', diet: 'alles', min: 15,
    items: [['garnelen', 150], ['couscous', 70], ['zucchini', 150], ['tomaten', 100], ['olivenoel', 10]],
    extra: 'Knoblauch, Petersilie, Zitrone',
    steps: ['Couscous mit kochendem Wasser übergießen, 5 Min. quellen lassen.', 'Zucchini und Garnelen mit Knoblauch in Öl braten.', 'Tomaten würfeln, alles mischen, mit Zitrone abschmecken.'],
  },
  {
    id: 'lachs-quinoa-bowl', name: 'Quinoa-Bowl mit Lachs & Avocado', cat: 'haupt', diet: 'alles', min: 20,
    items: [['quinoa', 60], ['lachs', 100], ['avocado', 70], ['gurke', 100], ['karotte', 50]],
    extra: 'Sojasauce, Limette, Sesam',
    steps: ['Quinoa nach Packung kochen.', 'Lachs von beiden Seiten braten.', 'Gemüse und Avocado schneiden.', 'In einer Schüssel anrichten, mit Sojasauce und Limette beträufeln.'],
  },
  {
    id: 'pellkartoffeln-quark', name: 'Pellkartoffeln mit Kräuterquark', cat: 'haupt', diet: 'veg', min: 25,
    items: [['kartoffeln', 350], ['magerquark', 200], ['gurke', 100], ['leinoel', 5]],
    extra: 'Schnittlauch, Petersilie, Salz',
    steps: ['Kartoffeln 20 Min. kochen.', 'Quark mit etwas Wasser, Kräutern und Salz cremig rühren.', 'Mit Leinöl beträufeln, Gurke dazu servieren.'],
  },
  {
    id: 'spinat-mozzarella-pasta', name: 'Pasta mit Spinat, Tomaten & Mozzarella', cat: 'haupt', diet: 'veg', min: 15,
    items: [['nudeln', 90], ['spinat', 100], ['tomaten', 150], ['mozzarella', 80], ['olivenoel', 5]],
    extra: 'Knoblauch, Basilikum',
    steps: ['Nudeln kochen.', 'Knoblauch und Tomaten in Öl anschwitzen, Spinat zusammenfallen lassen.', 'Nudeln untermischen, Mozzarella zupfen und darauf schmelzen lassen.'],
  },
  {
    id: 'gemuese-omelett', name: 'Gemüse-Omelett mit Brot', cat: 'haupt', diet: 'veg', min: 12,
    items: [['ei', 180], ['paprika', 100], ['spinat', 50], ['huettenkaese', 50], ['vollkornbrot', 50], ['olivenoel', 3]],
    extra: 'Salz, Pfeffer',
    steps: ['Paprika würfeln und kurz anbraten, Spinat dazu.', 'Verquirlte Eier darübergießen und stocken lassen.', 'Hüttenkäse darauf geben, zusammenklappen, mit Brot servieren.'],
  },

  // Snacks
  {
    id: 'skyr-beeren', name: 'Skyr mit Beeren', cat: 'snack', diet: 'veg', min: 2,
    items: [['skyr', 200], ['beeren', 80]],
    steps: ['Skyr in eine Schale, Beeren darauf.'],
  },
  {
    id: 'apfel-mandeln', name: 'Apfel & Mandeln', cat: 'snack', diet: 'vegan', min: 1,
    items: [['apfel', 150], ['mandeln', 20]],
    steps: ['Einpacken, mitnehmen.'],
  },
  {
    id: 'proteinshake', name: 'Proteinshake mit Banane', cat: 'snack', diet: 'veg', min: 2,
    items: [['whey', 30], ['milch', 250], ['banane', 120]],
    steps: ['Alles im Mixer oder Shaker mixen.'],
  },
  {
    id: 'reiswaffeln-pb', name: 'Reiswaffeln mit Erdnussbutter & Banane', cat: 'snack', diet: 'vegan', min: 2,
    items: [['reiswaffeln', 24], ['erdnussbutter', 15], ['banane', 60]],
    steps: ['Reiswaffeln mit Erdnussbutter bestreichen, Bananenscheiben darauf.'],
  },
  {
    id: 'huettenkaese-gemuese', name: 'Hüttenkäse mit Gurke & Tomate', cat: 'snack', diet: 'veg', min: 3,
    items: [['huettenkaese', 200], ['gurke', 100], ['tomaten', 100]],
    extra: 'Pfeffer, Kräuter',
    steps: ['Gemüse würfeln und unter den Hüttenkäse heben, würzen.'],
  },
  {
    id: 'eier-gemuesesticks', name: 'Gekochte Eier & Gemüsesticks', cat: 'snack', diet: 'veg', min: 10,
    items: [['ei', 120], ['karotte', 100], ['paprika', 100]],
    steps: ['Eier 9 Min. hart kochen.', 'Gemüse in Sticks schneiden.'],
  },
  {
    id: 'hummus-gemuese', name: 'Hummus mit Gemüsesticks', cat: 'snack', diet: 'vegan', min: 3,
    items: [['hummus', 60], ['karotte', 100], ['gurke', 100]],
    steps: ['Gemüse in Sticks schneiden und dippen.'],
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
