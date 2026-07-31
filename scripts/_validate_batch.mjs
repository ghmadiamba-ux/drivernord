import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "..", "docs", "business", "outreach-agent", "manual-smtp-batch-1-emails.json");
const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const emails = data.emails;

const FORBIDDEN_WORDS    = ["gratis", "0 kr"];
const FORBIDDEN_ENCODING = ["�", "Ã", "Â"];
const FORBIDDEN_COMPANIES = ["jpc"];

let issues = [];
let passed = 0;

console.log("\n=== DRY-RUN VALIDATION ===\n");

for (const em of emails) {
  const combined = (em.company + em.recipient_email).toLowerCase();
  if (FORBIDDEN_COMPANIES.some(t => combined.includes(t))) {
    console.log(`  [${em.id}] BLOCKED  JPC: ${em.company} — ${em.recipient_email}`);
    issues.push(`JPC found: ${em.company}`);
    continue;
  }

  const emIssues = [];

  for (const w of FORBIDDEN_WORDS) {
    if (em.body.toLowerCase().includes(w)) emIssues.push(`contains '${w}'`);
  }
  for (const c of FORBIDDEN_ENCODING) {
    if (em.body.includes(c)) emIssues.push(`encoding artifact U+${c.codePointAt(0).toString(16).toUpperCase()}`);
  }
  if (!em.body.includes("Ghislain Alexander Mad")) {
    emIssues.push("missing signature 'Ghislain Alexander Mad'");
  }
  if (em.body.includes("drivernord.se")) {
    emIssues.push("wrong domain drivernord.se — must be drivernord.com");
  }
  // Check Swedish characters survived (å ä ö Å Ä Ö)
  const bodyHasSwe = /[åäöÅÄÖ]/.test(em.body) || /[åäöÅÄÖ]/.test(em.subject);
  if (!bodyHasSwe && em.body.includes("f")) {
    // If body has Swedish words it should have Swedish chars
  }

  const label = emIssues.length === 0 ? "VALID " : "ISSUES";
  console.log(`  [${em.id}] ${label} | ${em.readiness_category.padEnd(20)} | ${em.company.padEnd(35)} | ${em.recipient_email}`);
  console.log(`         Subject : ${em.subject}`);
  if (em.recipient_name) console.log(`         Name    : ${em.recipient_name}`);
  for (const iss of emIssues) {
    console.log(`         !! ${iss}`);
    issues.push(`${em.company}: ${iss}`);
  }
  if (emIssues.length === 0) passed++;
}

console.log(`\nTotal : ${emails.length} emails`);
console.log(`Passed: ${passed} / ${emails.length}`);

if (issues.length > 0) {
  console.log(`\nVALIDATION FAILED (${issues.length} issue(s)):`);
  issues.forEach(i => console.log("  !! " + i));
  process.exit(1);
} else {
  console.log("\nAll emails passed validation. No issues found.");
  console.log("No emails sent. No secrets requested. No JPC.");
}
