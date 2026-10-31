// Rezept-Import per Claude API: liest Screenshots oder eingefügten Text aus
// und ordnet die Zutaten der Lebensmittelliste der App zu.

import { FOODS } from './data/foods.js';
import { state } from './store.js';

const MODEL = 'claude-opus-5-5';

// Das SDK wird erst beim ersten Import geladen, damit die App sonst schlank bleibt.
let sdkPromise = null;
const sdk = () => (sdkPromise ??= import('../vendor/anthropic-sdk.mjs').then((m) => m.default));

const FOOD_LIST = Object.values(FOODS).map((f) => `${f.id}: ${f.name}`).join('\n');

const SYSTEM = `Du liest Rezepte aus Screenshots oder Text aus und gibst sie strukturiert zurück.

Regeln:
- Übernimm Name, Anzahl Portionen, Zubereitungszeit in Minuten (0, wenn unbekannt) und die Zubereitungsschritte (auf Deutsch, knapp).
- Kategorie: "fruehstueck", "haupt" oder "snack".
- Jede Zutat mit Menge in Gramm (bzw. ml) für das GANZE Rezept. Rechne Angaben wie "2 EL", "1 Dose", "3 Eier" in Gramm um.
- Ordne jede Zutat der passenden ID aus der Lebensmittelliste zu (food_id). Passt nichts gut, lass food_id leer.
- Schätze immer zusätzlich die Nährwerte pro 100 g (kcal, Protein, Kohlenhydrate, Fett) – sie werden genutzt, wenn food_id leer ist.
- Gewürze, Salz, Kräuter und Wasser kommen nicht in die Zutatenliste, sondern in "extra".
- mealprep: true, wenn sich das Gericht zum Vorkochen für mehrere Tage eignet.

Lebensmittelliste (id: Name):
${FOOD_LIST}`;

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    category: { type: 'string', enum: ['fruehstueck', 'haupt', 'snack'] },
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

export class ImportError extends Error {}

// input: { images: [base64-JPEG] } oder { text }
export async function importRecipe(input) {
  if (!state.prefs.apiKey) throw new ImportError('Kein API-Schlüssel hinterlegt (Einstellungen → KI-Import).');
  const content = [
    ...(input.images ?? []).map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
    { type: 'text', text: input.text ? `Rezept:\n\n${input.text}` : 'Lies das Rezept aus diesen Screenshots aus.' },
  ];

  const Anthropic = await sdk();
  const anthropic = new Anthropic({ apiKey: state.prefs.apiKey, dangerouslyAllowBrowser: true });
  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
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

  if (response.stop_reason === 'refusal') throw new ImportError('Das Rezept konnte nicht ausgelesen werden.');
  if (response.stop_reason === 'max_tokens') throw new ImportError('Das Rezept ist zu lang für einen Import.');
  const text = response.content.find((b) => b.type === 'text')?.text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ImportError('Die Antwort konnte nicht gelesen werden.');
  }
}
