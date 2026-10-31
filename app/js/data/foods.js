// Nährwerte pro 100 g (bzw. 100 ml): kcal, Protein, Kohlenhydrate, Fett.
// Richtwerte aus gängigen Nährwerttabellen – genau genug für die Planung.
// unit: optionale Stückangabe für die Anzeige, ml: Flüssigkeit, cat: Abteilung für die Einkaufsliste.

const OG = 'Obst & Gemüse';
const KUEHL = 'Kühlregal';
const FF = 'Fleisch & Fisch';
const BROT = 'Brot & Getreide';
const VORRAT = 'Vorrat';

export const FOODS = {
  haferflocken: { name: 'Haferflocken', kcal: 370, p: 13.5, c: 58.7, f: 7, cat: BROT },
  milch: { name: 'Milch (1,5 %)', kcal: 47, p: 3.4, c: 4.8, f: 1.5, ml: true, cat: KUEHL },
  skyr: { name: 'Skyr', kcal: 63, p: 11, c: 4, f: 0.2, cat: KUEHL },
  magerquark: { name: 'Magerquark', kcal: 67, p: 12, c: 4, f: 0.2, cat: KUEHL },
  joghurt: { name: 'Naturjoghurt (3,5 %)', kcal: 64, p: 3.5, c: 4.5, f: 3.5, cat: KUEHL },
  huettenkaese: { name: 'Hüttenkäse', kcal: 98, p: 12.5, c: 2.5, f: 4, cat: KUEHL },
  feta: { name: 'Feta', kcal: 260, p: 17, c: 1, f: 21, cat: KUEHL },
  mozzarella: { name: 'Mozzarella light', kcal: 165, p: 19, c: 1, f: 9, cat: KUEHL },
  parmesan: { name: 'Parmesan', kcal: 400, p: 35, c: 0, f: 29, cat: KUEHL },
  butter: { name: 'Butter', kcal: 740, p: 0.7, c: 0.6, f: 82, cat: KUEHL },
  ei: { name: 'Eier', kcal: 140, p: 12.5, c: 0.7, f: 9.5, unit: { s: 'Stk', p: 'Stk', g: 60 }, cat: KUEHL },
  tofu: { name: 'Tofu natur', kcal: 125, p: 13, c: 2, f: 7.5, cat: KUEHL },
  hummus: { name: 'Hummus', kcal: 240, p: 7, c: 10, f: 18, cat: KUEHL },
  kokosmilch: { name: 'Kokosmilch light', kcal: 70, p: 0.7, c: 2, f: 7, ml: true, cat: VORRAT },

  kochschinken: { name: 'Kochschinken', kcal: 110, p: 19, c: 1, f: 3.5, cat: FF },
  putenbrust: { name: 'Putenbrust', kcal: 105, p: 24, c: 0, f: 1, cat: FF },
  haehnchen: { name: 'Hähnchenbrust', kcal: 110, p: 23.5, c: 0, f: 1.5, cat: FF },
  rinderhack: { name: 'Rinderhack (5 % Fett)', kcal: 125, p: 21, c: 0, f: 5, cat: FF },
  lachs: { name: 'Lachsfilet', kcal: 200, p: 20, c: 0, f: 13, cat: FF },
  garnelen: { name: 'Garnelen', kcal: 85, p: 18, c: 0.5, f: 1, cat: FF },
  thunfisch: { name: 'Thunfisch (im eigenen Saft)', kcal: 110, p: 25, c: 0, f: 1, cat: VORRAT },

  vollkornbrot: { name: 'Vollkornbrot', kcal: 215, p: 7.5, c: 37, f: 1.8, unit: { s: 'Scheibe', p: 'Scheiben', g: 50 }, cat: BROT },
  wrap: { name: 'Vollkorn-Wraps', kcal: 300, p: 9, c: 50, f: 7, unit: { s: 'Stk', p: 'Stk', g: 60 }, cat: BROT },
  reiswaffeln: { name: 'Reiswaffeln', kcal: 385, p: 8, c: 80, f: 3, unit: { s: 'Stk', p: 'Stk', g: 8 }, cat: BROT },
  reis: { name: 'Reis (roh)', kcal: 350, p: 7, c: 77, f: 0.6, cat: BROT },
  nudeln: { name: 'Vollkornnudeln (roh)', kcal: 350, p: 13, c: 64, f: 2.5, cat: BROT },
  couscous: { name: 'Couscous (roh)', kcal: 355, p: 12, c: 72, f: 1.9, cat: BROT },
  quinoa: { name: 'Quinoa (roh)', kcal: 368, p: 14, c: 64, f: 6, cat: BROT },

  linsen: { name: 'Rote Linsen (roh)', kcal: 340, p: 24, c: 50, f: 2, cat: VORRAT },
  kichererbsen: { name: 'Kichererbsen (Dose, abgetropft)', kcal: 120, p: 7, c: 16, f: 2.5, cat: VORRAT },
  kidney: { name: 'Kidneybohnen (Dose, abgetropft)', kcal: 100, p: 7, c: 13, f: 0.5, cat: VORRAT },
  mais: { name: 'Mais (Dose)', kcal: 80, p: 2.7, c: 15, f: 1.2, cat: VORRAT },
  passata: { name: 'Passierte Tomaten', kcal: 35, p: 1.4, c: 6, f: 0.2, cat: VORRAT },
  olivenoel: { name: 'Olivenöl', kcal: 884, p: 0, c: 0, f: 100, ml: true, cat: VORRAT },
  leinoel: { name: 'Leinöl', kcal: 884, p: 0, c: 0, f: 100, ml: true, cat: VORRAT },
  erdnussbutter: { name: 'Erdnussbutter', kcal: 600, p: 25, c: 15, f: 50, cat: VORRAT },
  mandeln: { name: 'Mandeln', kcal: 600, p: 21, c: 7, f: 52, cat: VORRAT },
  walnuesse: { name: 'Walnüsse', kcal: 690, p: 15, c: 7, f: 65, cat: VORRAT },
  chiasamen: { name: 'Chiasamen', kcal: 490, p: 17, c: 8, f: 31, cat: VORRAT },
  honig: { name: 'Honig', kcal: 304, p: 0.3, c: 82, f: 0, cat: VORRAT },
  whey: { name: 'Proteinpulver (Whey)', kcal: 380, p: 78, c: 6, f: 5, cat: VORRAT },

  banane: { name: 'Bananen', kcal: 89, p: 1.1, c: 20, f: 0.3, unit: { s: 'Stk', p: 'Stk', g: 120 }, cat: OG },
  apfel: { name: 'Äpfel', kcal: 52, p: 0.3, c: 12, f: 0.2, unit: { s: 'Stk', p: 'Stk', g: 150 }, cat: OG },
  beeren: { name: 'Beeren (TK)', kcal: 45, p: 1, c: 8, f: 0.5, cat: OG },
  avocado: { name: 'Avocado', kcal: 160, p: 2, c: 2, f: 15, unit: { s: 'Stk', p: 'Stk', g: 140 }, cat: OG },
  brokkoli: { name: 'Brokkoli', kcal: 34, p: 2.8, c: 4, f: 0.4, cat: OG },
  paprika: { name: 'Paprika', kcal: 31, p: 1, c: 6, f: 0.3, cat: OG },
  zucchini: { name: 'Zucchini', kcal: 17, p: 1.2, c: 2.2, f: 0.3, cat: OG },
  tomaten: { name: 'Tomaten', kcal: 18, p: 0.9, c: 3, f: 0.2, cat: OG },
  zwiebel: { name: 'Zwiebeln', kcal: 40, p: 1.1, c: 9, f: 0.1, cat: OG },
  spinat: { name: 'Spinat (frisch)', kcal: 23, p: 2.9, c: 1.4, f: 0.4, cat: OG },
  gurke: { name: 'Gurke', kcal: 15, p: 0.6, c: 2.2, f: 0.1, cat: OG },
  salat: { name: 'Salatmix', kcal: 17, p: 1.3, c: 2, f: 0.2, cat: OG },
  karotte: { name: 'Karotten', kcal: 41, p: 0.9, c: 9, f: 0.2, cat: OG },
  kartoffeln: { name: 'Kartoffeln', kcal: 77, p: 2, c: 16, f: 0.1, cat: OG },
  suesskartoffel: { name: 'Süßkartoffeln', kcal: 86, p: 1.6, c: 20, f: 0.1, cat: OG },
};

export const SHOP_ORDER = [OG, KUEHL, FF, BROT, VORRAT];
