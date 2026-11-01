// KI-Funktionen über die Claude API: Rezepte aus Screenshots/Text auslesen
// und frei eingegebene Mahlzeiten für den Tagesrechner schätzen.

import { FOODS } from './data/foods.js';
import { state } from './store.js';

const MODEL = 'claude-opus-5-5';

// Das SDK wird erst beim ersten KI-Aufruf geladen, damit die App sonst schlank bleibt.
let sdkPromise = null;
const sdk = () => (sdkPromise ??= import('../vendor/anthropic-sdk.mjs').then((m) => m.default));

export class ImportError extends Error {}

const imageBlocks = (images = []) =>
  images.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }));

// Gemeinsamer Aufruf: liefert das JSON-Ergebnis gemäß Schema oder wirft einen ImportError mit verständlicher Meldung.
async function ask({ system, content, schema }) {
  if (!state.prefs.apiKey) throw new ImportError('Kein API-Schlüssel hinterlegt (Einstellungen → KI).');
  const Anthropic = await sdk();
  const anthropic = new Anthropic({ apiKey: state.prefs.apiKey, dangerouslyAllowBrowser: true });
  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      // Falls eine Sicherheitsprüfung ablehnt, übernimmt automatisch ein passendes anderes Modell.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ImportError('Der API-Schlüssel ist ungültig.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new ImportError('Der API-Schlüssel hat keine Berechtigung für dieses Modell.');
    if (e instanceof Anthropic.RateLimitError) throw new ImportError('Zu viele Anfragen – bitte kurz warten.');
    if (e instanceof Anthropic.BadRequestError) throw new ImportError(`Anfrage abgelehnt: ${e.message}`);
    if (e instanceof Anthropic.InternalServerError) throw new ImportError('Der KI-Dienst ist gerade nicht erreichbar.');
    if (e instanceof Anthropic.APIConnectionError) throw new ImportError('Keine Verbindung – bist du online?');
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new ImportError('Die Anfrage konnte nicht ausgewertet werden.');
  if (response.stop_reason === 'max_tokens') throw new ImportError('Die Eingabe ist zu lang.');
  const text = response.content.find((b) => b.type === 'text')?.text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ImportError('Die Antwort konnte nicht gelesen werden.');
  }
}

// --- Rezept-Import ------------------------------------------------------------------

const FOOD_LIST = Object.values(FOODS).map((f) => `${f.id}: ${f.name}`).join('\n');

const RECIPE_SYSTEM = `Du liest Rezepte aus Screenshots oder Text aus und gibst sie strukturiert zurück.

Regeln:
- Übernimm Name, Anzahl Portionen, Zubereitungszeit in Minuten (0, wenn unbekannt) und die Zubereitungsschritte (auf Deutsch, knapp).
- Kategorie: "fruehstueck", "haupt", "snack" oder "shake".
- Jede Zutat mit Menge in Gramm (bzw. ml) für das GANZE Rezept. Rechne Angaben wie "2 EL", "1 Dose", "3 Eier" in Gramm um.
- Ordne jede Zutat der passenden ID aus der Lebensmittelliste zu (food_id). Passt nichts gut, lass food_id leer.
- Schätze immer zusätzlich die Nährwerte pro 100 g (kcal, Protein, Kohlenhydrate, Fett) – sie werden genutzt, wenn food_id leer ist.
- Gewürze, Salz, Kräuter und Wasser kommen nicht in die Zutatenliste, sondern in "extra".
- mealprep: true, wenn sich das Gericht zum Vorkochen für mehrere Tage eignet.

Lebensmittelliste (id: Name):
${FOOD_LIST}`;

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    category: { type: 'string', enum: ['fruehstueck', 'haupt', 'snack', 'shake'] },
    servings: { type: 'integer' },
    minutes: { type: 'integer' },
    mealprep: { type: 'boolean' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          food_id: { type: 'string' },
          grams: { type: 'number' },
          kcal_100g: { type: 'number' },
          protein_100g: { type: 'number' },
          carbs_100g: { type: 'number' },
          fat_100g: { type: 'number' },
        },
        required: ['name', 'food_id', 'grams', 'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g'],
        additionalProperties: false,
      },
    },
    extra: { type: 'string' },
    steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'category', 'servings', 'minutes', 'mealprep', 'ingredients', 'extra', 'steps'],
  additionalProperties: false,
};

// input: { images: [base64-JPEG] } oder { text }
export function importRecipe(input) {
  return ask({
    system: RECIPE_SYSTEM,
    schema: RECIPE_SCHEMA,
    content: [
      ...imageBlocks(input.images),
      { type: 'text', text: input.text ? `Rezept:\n\n${input.text}` : 'Lies das Rezept aus diesen Screenshots aus.' },
    ],
  });
}

// --- Mahlzeiten schätzen (Tagesrechner) ---------------------------------------------------

const MEAL_SYSTEM = `Du schätzt die Nährwerte von Mahlzeiten, die jemand frei beschreibt oder fotografiert.

Regeln:
- Zerlege die Eingabe in einzelne Positionen (z. B. "2 Brötchen mit Käse" → Brötchen und Käse oder als ein Gericht, wenn das üblicher ist).
- amount: kurze Mengenangabe auf Deutsch, z. B. "2 Stück", "ca. 350 g", "0,5 l".
- Ist keine Menge angegeben, nimm eine typische Portion in Deutschland an.
- kcal, protein, carbs und fat gelten für die GESAMTE angegebene Menge (nicht pro 100 g), realistisch gerundet.
- name: kurzer, verständlicher deutscher Name.
- note: höchstens ein Satz, nur wenn eine Annahme wichtig ist (sonst leer).`;

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          kcal: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
        },
        required: ['name', 'amount', 'kcal', 'protein', 'carbs', 'fat'],
        additionalProperties: false,
      },
    },
    note: { type: 'string' },
  },
  required: ['items', 'note'],
  additionalProperties: false,
};

// input: { text } und/oder { images: [base64-JPEG] }
export function estimateMeal(input) {
  return ask({
    system: MEAL_SYSTEM,
    schema: MEAL_SCHEMA,
    content: [
      ...imageBlocks(input.images),
      { type: 'text', text: input.text ? `Gegessen:\n${input.text}` : 'Was ist auf dem Foto und was steckt drin?' },
    ],
  });
}
