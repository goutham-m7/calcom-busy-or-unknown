import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import type { Interval, Query, Transport } from "./types.js";
const vendor = new URL("../vendor/", import.meta.url);
export function verifyVendor(): boolean {
  const manifest = JSON.parse(readFileSync(new URL("provenance.json", vendor), "utf8")) as {
    files: Record<string, string>;
  };
  return Object.entries(manifest.files).every(
    ([path, hash]) =>
      createHash("sha256")
        .update(readFileSync(new URL(path.slice("vendor/".length), vendor)))
        .digest("hex") === hash,
  );
}
const names = [
  "getAvailability",
  "fetchBusyTimes",
  "fetchResponsesWithNextLink",
  "fetchRequestWithRetryAfter",
  "apiGraphBatchCall",
  "handleTextJsonResponseWithHtmlInBody",
  "findRetryAfterResponse",
  "processBusyTimes",
  "handleErrorJsonOffice365Calendar",
];
function compile(): string {
  if (!verifyVendor()) throw new Error("Vendored source checksum mismatch");
  const text = readFileSync(new URL("CalendarService.ts", vendor), "utf8");
  const ast = ts.createSourceFile("CalendarService.ts", text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(
    (node): node is ts.ClassDeclaration =>
      ts.isClassDeclaration(node) && node.name?.text === "Office365CalendarService",
  );
  if (!declaration) throw new Error("Office365 class missing");
  const members = names.map((name) => {
    const matches = declaration.members.filter((member) => member.name?.getText(ast) === name);
    if (matches.length !== 1) throw new Error("Source member drift: " + name);
    return matches[0]!.getText(ast);
  });
  // Method bodies are verbatim. Only the external Graph boundary and unrelated setup are replaced.
  return ts.transpileModule(
    'class Adapter { integrationName = "office365_calendar"; apiGraphUrl = "https://graph.microsoft.com/v1.0"; log = { error() {} }; getUserEndpoint() { return Promise.resolve("/me"); } listCalendars() { throw new Error("Explicit selected calendars required"); } fetcher = fetcher; ' +
      members.join("\n") +
      " }; new Adapter();",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
}
const compiled = compile();
export async function upstreamAvailability(
  query: Query,
  transport: Transport,
): Promise<Interval[]> {
  if (!query.calendars.length) throw new Error("Explicit selected calendars required");
  const fetcher = async (_endpoint: string, options: { body: string }) =>
    transport((JSON.parse(options.body) as { requests: Parameters<Transport>[0] }).requests);
  // Mirrors the external helper's gzip-text / normal-JSON contract. No real compression is claimed.
  const handleErrorsJson = async (response: Response) => {
    if (!response.ok) throw new Error("Graph outer HTTP " + response.status);
    return response.headers.get("content-encoding") === "gzip" ? response.text() : response.json();
  };
  const context = vm.createContext({
    fetcher,
    handleErrorsJson,
    setTimeout: (callback: () => void) => {
      callback();
      return 0;
    },
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
    Response,
  });
  const adapter = vm.runInContext(compiled, context, { timeout: 1000 }) as {
    getAvailability(params: unknown): Promise<Interval[]>;
  };
  return adapter.getAvailability({
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    selectedCalendars: query.calendars.map((externalId) => ({
      integration: "office365_calendar",
      externalId,
    })),
    mode: "overlay",
  });
}
