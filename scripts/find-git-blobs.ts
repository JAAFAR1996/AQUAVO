import { execSync } from 'child_process';
import fs from 'fs';

console.log("Searching git history for large product JSON backups...");

try {
  // Get all commits that touched a file with "product" and ".json"
  // git log --all --name-status --oneline --> parse lines
  const log = execSync('git log --all --name-only --oneline').toString();
  const commits = log.split('\n');
  
  const relevantFiles = new Set<string>();
  
  for (const line of commits) {
    if (line.includes('.json') && (line.includes('product') || line.includes('products'))) {
      const parts = line.split(' ');
      if (parts.length > 1) {
        const file = parts.slice(1).join(' ').trim();
        if (file.endsWith('.json')) {
          relevantFiles.add(file);
        }
      }
    }
  }

  console.log(`Found ${relevantFiles.size} potential files. Trying to extract...`);

  let count = 0;
  // Get the most recent non-empty content for each file
  for (const file of relevantFiles) {
    try {
      // Find the last commit that added or modified the file
      const addCommit = execSync(`git log -1 --format="%H" --diff-filter=A -- ${file}`).toString().trim()
        || execSync(`git log -1 --format="%H" --diff-filter=M -- ${file}`).toString().trim();
      
      if (addCommit) {
        const content = execSync(`git show ${addCommit}:${file}`).toString();
        if (content.length > 1000) { // Only care if > 1KB
            fs.writeFileSync(`recovered_${file.replace(/[\/\\]/g, '_')}`, content);
            console.log(`✅ Recovered ${file} (${content.length} bytes) from commit ${addCommit.substring(0, 7)}`);
            count++;
        }
      }
    } catch {
      // Ignore failures
    }
  }
  
  if (count === 0) {
    console.log("❌ No large JSON files found. Try searching for CSV or SQL files.");
  }

} catch (err: any) {
  console.log("Error:", err.message);
}
