import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const jaafarProducts = JSON.parse(fs.readFileSync('jaafar_products_clean.json', 'utf-8'));

// Manual mapping for similar products
const keywordMatches: { [key: string]: string[] } = {
  'small-fish-feed': ['small fish', '0.6mm', '75g'],
  'betta-fish-food': ['betta', 'fish food', '130g'],
  'red-worm': ['red worm', '115g'],
  'shrimp-food': ['shrimp', '260g'],
  'hermit-crab': ['hermit crab', '55g'],
  'freeze-dried-brine': ['brine shrimp', '18g'],
  '3-in-1-betta': ['3-in-1', 'betta', '15g'],
  'white-spot': ['white spot', '300ml'],
  'methylene-blue': ['methylene blue'],
  'probiotics': ['probiotics', 'active'],
  'chlorine-removal': ['chlorine removal', 'stabilizer'],
  'anti-stress': ['anti-stress', 'stabilizer'],
  'ammonia-tester': ['ammonia', 'tester'],
  'nitrite-test': ['nitrite', 'test'],
  '9-in-1': ['9-in-1', 'test strips'],
  'nitrifying': ['nitrifying', 'capsules'],
  'algaecide': ['algaecide', 'algae'],
  'heating-rod': ['heating rod', 'heater', '50w', '100w', '200w'],
  'water-grass-mud': ['water grass mud', 'fertility'],
  'oxygen-pump': ['oxygen pump', 'air pump'],
  'bubble-diffuser': ['bubble', 'diffuser'],
  'isolation-box': ['isolation box'],
  'incubator': ['incubator'],
  'filter-cotton': ['filter cotton', '6d'],
  'descaling': ['descaling', 'descaler'],
  'culture-ring': ['culture ring', 'nano'],
  'culture-brick': ['culture brick', 'energy'],
  'filter-material': ['filter material'],
  'oil-film': ['oil film'],
  'thermometer': ['thermometer'],
  'magnetic': ['magnetic', 'brush', 'cleaner'],
  'glass-tank': ['glass tank', 'ultra clear'],
  'stream-tank': ['stream tank'],
};

async function main() {
  const dbProducts = await sql`SELECT id, name, slug FROM products WHERE slug LIKE 'yee%' ORDER BY slug`;

  console.log('=== YEE PRODUCTS IN DATABASE ===');
  console.log(`Total Yee products: ${dbProducts.length}`);
  console.log();

  // Print all Yee products with their current slugs
  dbProducts.forEach((p: any, i: number) => {
    console.log(`${i+1}. ID: ${p.id} | ${p.slug}`);
  });

  console.log('\n=== EXCEL PRODUCTS ===');
  jaafarProducts.forEach((p: any, i: number) => {
    console.log(`${i+1}. Model: ${p.model} | ${p.english_name.substring(0, 60)}`);
  });

  // Create a mapping
  console.log('\n=== MATCHING SUGGESTIONS ===');
  const suggestions: any[] = [];

  for (const jp of jaafarProducts) {
    const modelLower = jp.model.toLowerCase();
    const nameLower = jp.english_name.toLowerCase();

    // Find possible matches
    const possibleMatches = dbProducts.filter((dp: any) => {
      const slugLower = dp.slug.toLowerCase();
      const dbNameLower = dp.name.toLowerCase();

      // Check various matching criteria
      if (nameLower.includes('heating') && slugLower.includes('heater')) return true;
      if (nameLower.includes('betta') && slugLower.includes('betta')) return true;
      if (nameLower.includes('shrimp') && slugLower.includes('shrimp')) return true;
      if (nameLower.includes('probiotics') && slugLower.includes('probiotics')) return true;
      if (nameLower.includes('algaecide') && slugLower.includes('algaecide')) return true;
      if (nameLower.includes('methylene') && slugLower.includes('methylene')) return true;
      if (nameLower.includes('white spot') && slugLower.includes('white-spot')) return true;
      if (nameLower.includes('oxygen pump') && slugLower.includes('oxygen')) return true;
      if (nameLower.includes('thermometer') && slugLower.includes('thermometer')) return true;
      if (nameLower.includes('isolation') && slugLower.includes('isolation')) return true;
      if (nameLower.includes('incubator') && slugLower.includes('incubator')) return true;
      if (nameLower.includes('filter material') && slugLower.includes('filter-material')) return true;
      if (nameLower.includes('filter cotton') && slugLower.includes('filter-cotton')) return true;
      if (nameLower.includes('oil film') && slugLower.includes('oil-film')) return true;
      if (nameLower.includes('culture') && slugLower.includes('culture')) return true;
      if (nameLower.includes('descaling') && slugLower.includes('descaling')) return true;
      if (nameLower.includes('diffuser') && slugLower.includes('diffuser')) return true;
      if (nameLower.includes('glass tank') && slugLower.includes('glass-tank')) return true;
      if (nameLower.includes('stream tank') && slugLower.includes('stream-tank')) return true;
      if (nameLower.includes('water grass') && slugLower.includes('water-grass')) return true;
      if (nameLower.includes('airbag') && slugLower.includes('airbag')) return true;
      if (nameLower.includes('stabilizer') && slugLower.includes('stabilizer')) return true;
      if (nameLower.includes('nitrifying') && slugLower.includes('nitrifying')) return true;
      if (nameLower.includes('test') && nameLower.includes('9') && slugLower.includes('9-in-1')) return true;
      if (nameLower.includes('refill') && slugLower.includes('refill')) return true;
      if (nameLower.includes('mineral salt') && slugLower.includes('mineral-salt')) return true;
      if (nameLower.includes('multivitamin') && slugLower.includes('multivitamin')) return true;
      if (nameLower.includes('chlorine') && slugLower.includes('chlorine')) return true;
      if (nameLower.includes('hermit crab') && slugLower.includes('hermit-crab')) return true;
      if (nameLower.includes('freeze-dried') && slugLower.includes('freeze-dried')) return true;
      if (nameLower.includes('all-in-one') && slugLower.includes('all-in-one')) return true;
      if (nameLower.includes('small fish') && slugLower.includes('small-fish')) return true;
      if (nameLower.includes('red worm') && slugLower.includes('red-worm')) return true;
      if (nameLower.includes('high protein') && slugLower.includes('high-protein')) return true;
      if (nameLower.includes('quartz') && slugLower.includes('quartz')) return true;
      if (nameLower.includes('black warrior') && slugLower.includes('black-warrior')) return true;

      return false;
    });

    if (possibleMatches.length > 0) {
      suggestions.push({
        model: jp.model,
        excelName: jp.english_name,
        matches: possibleMatches.map((m: any) => ({ id: m.id, slug: m.slug }))
      });
    }
  }

  console.log(`Found ${suggestions.length} products with possible matches`);
  suggestions.forEach((s, i) => {
    console.log(`\n${i+1}. Model: ${s.model}`);
    console.log(`   Excel: ${s.excelName.substring(0, 60)}`);
    s.matches.forEach((m: any) => {
      console.log(`   -> DB ID ${m.id}: ${m.slug}`);
    });
  });

  fs.writeFileSync('match_suggestions.json', JSON.stringify(suggestions, null, 2));
}

main().catch(console.error);
