import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const storeId = "00000000-0000-4000-8000-000000000001";
const userId = "test-user";
const cases = [
  { name: "active Store owner", role: "owner", allowed: true },
  { name: "active Store administrator", role: "admin", allowed: true },
  { name: "Store manager", role: "manager", allowed: false },
  { name: "Store staff", role: "staff", allowed: false },
  { name: "customer without membership", noMembership: true, allowed: false },
  { name: "legacy global administrator without membership", noMembership: true, globalAdmin: true, allowed: false },
  { name: "inactive Store administrator", role: "admin", status: "inactive", allowed: false },
  { name: "administrator of another organisation", role: "admin", organisationId: "other-store", allowed: false },
  { name: "membership belonging to another user", role: "admin", membershipUser: "another-user", allowed: false },
  { name: "failed membership lookup", role: "admin", error: true, allowed: false },
];

// Extract the actual deployed helper without importing Deno.serve or invoking
// provider APIs. Each mock applies the query filters to a supplied membership.
for (const [slug, name] of [
  ["printify-sync", "requireAdmin"],
  ["cj-product-sync", "requireAdmin"],
  ["cj-qualification", "requireCossaStoreAdmin"],
]) {
  const source = await readFile(new URL(`../${slug}/index.ts`, import.meta.url), "utf8");
  const parsed = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
  const helper = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(helper, `${slug} must have its administrator helper`);
  const { outputText } = ts.transpileModule(helper.getText(parsed), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  const authorize = vm.runInNewContext(`${outputText}\n${name}`, { ORG_ID: storeId });

  for (const scenario of cases) {
    test(`${slug}: ${scenario.name}`, async () => {
      const membership = {
        organisation_id: scenario.organisationId ?? storeId,
        user_id: scenario.membershipUser ?? userId,
        status: scenario.status ?? "active",
        role: scenario.role ?? "customer",
      };
      const client = {
        from(table) {
          // If the global-role fallback is reintroduced, the legacy-admin
          // case returns a row and the rejection assertion below fails.
          let rows = table === "user_roles"
            ? (scenario.globalAdmin ? [{ user_id: userId, role: "admin" }] : [])
            : (scenario.noMembership ? [] : [membership]);
          assert.ok(["organisation_members", "user_roles"].includes(table));
          const query = {
            select() { return query; },
            eq(column, value) { rows = rows.filter((row) => row[column] === value); return query; },
            in(column, values) { rows = rows.filter((row) => values.includes(row[column])); return query; },
            then(resolve, reject) {
              return Promise.resolve({
                data: rows,
                error: scenario.error ? new Error("membership lookup unavailable") : null,
              }).then(resolve, reject);
            },
          };
          return query;
        },
      };
      let allowed = false;
      try {
        await authorize(client, userId);
        allowed = true;
      } catch {
        // Some existing endpoints intentionally throw a numeric sentinel.
      }
      assert.equal(allowed, scenario.allowed);
    });
  }
}
