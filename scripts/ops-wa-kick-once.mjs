const url = "https://www.aquavoiq.com/api/metadata/ops-wa-kick-vBsIixb77BEQ?token=PW6tp2zRITPR8rgrwCSdskJluCLxKDPPM528FZAVBcY";

const response = await fetch(url, { signal: AbortSignal.timeout(55_000) });
const body = await response.text();
console.log(`[ops-wa-kick] HTTP ${response.status}: ${body.slice(0, 1000)}`);
if (!response.ok) process.exit(1);
