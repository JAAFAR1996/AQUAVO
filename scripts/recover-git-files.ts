import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const filesToRecover = [
  'products.json',
  'jaafar_products.json',
  'jaafar_products_clean.json',
  'houyi_products_clean.json',
  'hygger_products.json',
  'yee_products_excel.json',
  'missing_products_final.json'
];

console.log("Recovering files from git history...");

for (const file of filesToRecover) {
  try {
    // Find the commit before it was deleted
    const logOut = execSync(`git log -1 --format="%H" -- ${file}`).toString().trim();
    if (!logOut) {
      console.log(`- ${file}: No history found.`);
      continue;
    }
    
    // We get the file content at the commit where it existed.
    // Actually, `git log -1` returns the commit that DELETED it.
    // So we use `${logOut}^:${file}` to get the content BEFORE deletion.
    let content;
    try {
      content = execSync(`git show ${logOut}^:${file}`).toString();
    } catch {
      // If the last commit was an Add or Modify, it still exists in that commit literally
      content = execSync(`git show ${logOut}:${file}`).toString();
    }

    if (content && content.length > 0) {
      fs.writeFileSync(`recovered_${file}`, content);
      console.log(`✅ Recovered ${file} (${content.length} bytes) to recovered_${file}`);
    } else {
      console.log(`- ${file} was empty.`);
    }

  } catch (err: any) {
    console.log(`❌ Failed to recover ${file}: ${err.message}`);
  }
}
