import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("supabase/functions/store-eft-checkout/index.ts", "utf8");
const start = source.indexOf("      let returnUpdate = admin");
const end = source.indexOf("\n    if (action ===", start);
const block = source.slice(start, end).replace(/\s*}\s*$/, "");
const compiled = ts.transpileModule(
  `async function run(admin, update, attemptId, userData, request, json, yocoAttemptPublic) { ${block} }`,
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  },
).outputText;
const run = new Function(`${compiled}; return run;`)();

for (const returned of ["cancelled", "failed"]) {
  for (const initialStatus of ["created", "succeeded"]) {
    test(`${returned} return preserves authoritative state from ${initialStatus}`, async () => {
      const row = { id: "attempt", payer_user_id: "owner", status: initialStatus };
      let mutationCount = 0;
      const admin = {
        from() {
          let patch;
          const filters: Array<(value: typeof row) => boolean> = [];
          const query = {
            update(value) {
              patch = value;
              return query;
            },
            select() {
              return query;
            },
            eq(key, value) {
              filters.push((r) => r[key] === value);
              return query;
            },
            neq(key, value) {
              filters.push((r) => r[key] !== value);
              return query;
            },
            async maybeSingle() {
              if (!filters.every((filter) => filter(row))) return { data: null, error: null };
              if (patch) {
                Object.assign(row, patch);
                mutationCount++;
              }
              return { data: row, error: null };
            },
            async single() {
              return query.maybeSingle();
            },
          };
          return query;
        },
      };
      const result = await run(
        admin,
        { status: returned },
        "attempt",
        { user: { id: "owner" } },
        {},
        (_request, body) => body,
        (attempt) => attempt,
      );
      const expected = initialStatus === "succeeded" ? "succeeded" : returned;
      assert.equal(row.status, expected);
      assert.equal(mutationCount, initialStatus === "succeeded" ? 0 : 1);
      assert.equal(result.attempt.status, expected);
    });
  }
}
