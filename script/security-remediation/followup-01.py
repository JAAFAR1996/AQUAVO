from pathlib import Path
# The live ledger already has 0100_whatsapp_lifecycle_provider_approval.
# Use a new, unoccupied version; never change that existing ledger record.
for suffix in ['', '_rollback']:
    old=Path(f'migrations/0100_security_commerce_boundaries{suffix}.sql')
    new=Path(f'migrations/0101_security_commerce_boundaries{suffix}.sql')
    assert old.is_file() and not new.exists()
    new.write_text(old.read_text().replace('0100','0101'))
    old.unlink()
p=Path('server/__tests__/security-commerce-repair.test.ts')
s=p.read_text();assert s.count('migrations/0100_security_commerce_boundaries.sql')==1
p.write_text(s.replace('migrations/0100_security_commerce_boundaries.sql','migrations/0101_security_commerce_boundaries.sql'))
