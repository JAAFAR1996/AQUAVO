
import crypto from "crypto";

function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const digest = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${digest}`;
}

const password = "admin123";
const hash = hashPassword(password);


import fs from 'fs';
fs.writeFileSync('admin_sql.txt', `
INSERT INTO users (
  email, 
  password_hash, 
  full_name, 
  role, 
  email_verified, 
  created_at, 
  updated_at
) VALUES (
  'admin@fishweb.com', 
  '${hash}', 
  'System Admin', 
  'admin', 
  true, 
  NOW(), 
  NOW()
);
`);

