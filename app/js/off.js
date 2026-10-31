// Suche in der freien Lebensmitteldatenbank Open Food Facts (braucht Internet).

const URL = 'https://world.openfoodfacts.org/cgi/search.pl';

export async function searchOff(query) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    lc: 'de',
    fields: 'code,product_name,product_name_de,brands,nutriments',
  });
  const res = await fetch(`${URL}?${params}`);
  if (!res.ok) throw new Error(`Open Food Facts antwortet mit ${res.status}`);
  const data = await res.json();
  return (data.products ?? [])
    .map((p) => {
      const n = p.nutriments ?? {};
      const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
      const name = (p.product_name_de || p.product_name || '').trim();
      if (!name || kcal == null) return null;
      return {
        code: p.code,
        name: p.brands ? `${name} (${p.brands.split(',')[0].trim()})` : name,
        kcal: Math.round(kcal),
        p: round1(n.proteins_100g),
        c: round1(n.carbohydrates_100g),
        f: round1(n.fat_100g),
      };
    })
    .filter(Boolean);
}

const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
