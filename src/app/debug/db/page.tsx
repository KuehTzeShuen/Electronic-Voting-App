"use client";

import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TableResult = {
  rows: unknown[];
  error: string | null;
};

export default function DebugDatabasePage() {
  const [tablesInput, setTablesInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, TableResult>>({});
  const [rpcTables, setRpcTables] = useState<string[] | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const tablesToQuery = useMemo(() => {
    const manual = tablesInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return (rpcTables && rpcTables.length > 0 ? rpcTables : manual).slice(0, 20);
  }, [tablesInput, rpcTables]);

  const tryLoadTablesFromRpc = useCallback(async () => {
    setRpcError(null);
    setRpcTables(null);
    const { data, error } = await supabase.rpc("list_tables");
    if (error) {
      setRpcError(error.message || "Failed to call list_tables RPC");
      return;
    }
    const names = Array.isArray(data)
      ? data
          .map((r: unknown) =>
            typeof r === "object" && r !== null && "table_name" in r
              ? String((r as Record<string, unknown>).table_name)
              : null
          )
          .filter((v): v is string => !!v)
      : [];
    setRpcTables(names);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setResults({});
    try {
      const next: Record<string, TableResult> = {};
      await Promise.all(
        tablesToQuery.map(async (table) => {
          const { data, error } = await supabase.from(table).select("*").limit(100);
          next[table] = {
            rows: data ?? [],
            error: error ? error.message : null,
          };
        })
      );
      setResults(next);
    } finally {
      setIsLoading(false);
    }
  }, [tablesToQuery]);

  return (
    <div className="fixed inset-0 bg-background text-foreground overflow-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Supabase Debug - List Table Rows</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter comma-separated table names below, or use the optional RPC helper if you created it.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 max-w-xl">
          <label className="text-sm">Table names (comma-separated)</label>
          <input
            type="text"
            value={tablesInput}
            onChange={(e) => setTablesInput(e.target.value)}
            placeholder="e.g. users, profiles, votes"
            className="w-full rounded-md px-3 py-2 bg-card text-foreground border border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading || tablesToQuery.length === 0}
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load rows"}
          </button>

          <button
            onClick={tryLoadTablesFromRpc}
            className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm"
          >
            Use list_tables RPC
          </button>

          {rpcTables && (
            <span className="text-xs text-muted-foreground">
              RPC tables: {rpcTables.join(", ")}
            </span>
          )}
          {rpcError && (
            <span className="text-xs text-destructive">
              RPC error: {rpcError}
            </span>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Optional SQL to create an RPC that lists non-system tables for anon testing:
          <pre className="mt-2 whitespace-pre-wrap bg-card p-3 rounded-md border border-border">
{`-- Run in Supabase SQL editor
create or replace function list_tables()
returns table(table_name text)
language sql
security definer
as $$
  select tablename as table_name
  from pg_tables
  where schemaname = 'public'
  order by tablename;
$$;

-- Allow anon to execute for testing (optional)
grant execute on function list_tables() to anon;`}
          </pre>
        </div>
      </section>

      <section className="space-y-6">
        {tablesToQuery.length === 0 && (
          <div className="text-sm text-muted-foreground">No tables specified yet.</div>
        )}
        {tablesToQuery.map((table) => {
          const tableResult = results[table];
          return (
            <div key={table} className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="text-sm font-medium">{table}</div>
                {tableResult?.error && (
                  <div className="text-xs text-destructive">{tableResult.error}</div>
                )}
              </div>
              <div className="p-4 overflow-x-auto">
                {tableResult ? (
                  tableResult.rows.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          {Object.keys(tableResult.rows[0] as Record<string, unknown>).map((key) => (
                            <th key={key} className="px-2 py-1 border-b border-border font-normal">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableResult.rows.map((row, idx) => (
                          <tr key={idx} className="border-b border-border/60">
                            {Object.entries(row as Record<string, unknown>).map(([k, v]) => (
                              <td key={k} className="px-2 py-1 align-top">
                                <pre className="text-xs whitespace-pre-wrap break-words">
                                  {safeStringify(v)}
                                </pre>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-muted-foreground">No rows.</div>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Not loaded yet.</div>
                )}
              </div>
            </div>
          );
        })}
      </section>
      </div>
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return String(value);
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}


