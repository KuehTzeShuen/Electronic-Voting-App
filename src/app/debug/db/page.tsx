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
  const [deleting, setDeleting] = useState<Record<string, Record<number, boolean>>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadMsg, setUploadMsg] = useState<Record<string, string | null>>({});
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

  const inferKeyFilter = (row: Record<string, unknown>): Record<string, unknown> => {
    // Prefer common primary key columns if present; otherwise fall back to full row match (debug-only)
    const candidates = ["id", "uuid", "student_id"]; // extend as needed
    for (const key of candidates) {
      if (key in row && row[key] !== undefined && row[key] !== null) {
        return { [key]: row[key] } as Record<string, unknown>;
      }
    }
    return row;
  };

  const handleDeleteRow = useCallback(
    async (table: string, idx: number, row: unknown) => {
      if (!row || typeof row !== "object") return;
      setDeleting((prev) => ({ ...prev, [table]: { ...(prev[table] || {}), [idx]: true } }));
      try {
        const filter = inferKeyFilter(row as Record<string, unknown>);
        const query = supabase.from(table).delete().match(filter);
        const { error } = await query;
        if (error) throw error;
        // Optimistically remove from UI
        setResults((prev) => {
          const current = prev[table];
          if (!current) return prev;
          const nextRows = current.rows.filter((_, i) => i !== idx);
          return { ...prev, [table]: { ...current, rows: nextRows } };
        });
      } finally {
        setDeleting((prev) => ({ ...prev, [table]: { ...(prev[table] || {}), [idx]: false } }));
      }
    },
    []
  );

  const parseCsv = async (file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> => {
    const text = await file.text();
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const cols = parseLine(line);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] ?? null;
      });
      return obj;
    });
    return { headers, rows };
  };

  const handleUploadCsv = useCallback(
    async (table: string, file: File | null) => {
      if (!file) return;
      setUploadMsg(prev => ({ ...prev, [table]: null }));
      setUploading(prev => ({ ...prev, [table]: true }));
      try {
        const { rows } = await parseCsv(file);
        if (rows.length === 0) {
          setUploadMsg(prev => ({ ...prev, [table]: "No rows found in CSV." }));
          return;
        }
        // Insert in chunks to avoid payload limits
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const { error } = await supabase.from(table).insert(chunk);
          if (error) throw error;
        }
        setUploadMsg(prev => ({ ...prev, [table]: `Uploaded ${rows.length} rows.` }));
        // refresh table data
        await loadData();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as any).message) : 'Upload failed';
        setUploadMsg(prev => ({ ...prev, [table]: msg }));
      } finally {
        setUploading(prev => ({ ...prev, [table]: false }));
      }
    },
    [loadData]
  );

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
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleUploadCsv(table, e.target.files?.[0] ?? null)}
                    disabled={!!uploading[table]}
                  />
                  {uploading[table] && <span className="text-xs text-muted-foreground">Uploading...</span>}
                  {uploadMsg[table] && <span className="text-xs">{uploadMsg[table]}</span>}
                </div>
                {tableResult ? (
                  tableResult.rows.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1 border-b border-border font-normal w-[1%]"></th>
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
                            <td className="px-2 py-1 align-top">
                              <button
                                type="button"
                                aria-label="Delete row"
                                title="Delete row"
                                disabled={!!deleting[table]?.[idx]}
                                onClick={() => handleDeleteRow(table, idx, row)}
                                className="inline-flex items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 px-2 py-1 text-xs"
                              >
                                ×
                              </button>
                            </td>
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


