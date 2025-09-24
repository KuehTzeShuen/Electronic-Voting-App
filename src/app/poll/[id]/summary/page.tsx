"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DatasetRow = {
  voter_id: string;
  option_id: string;
  option_label: string | null;
  created_at: string | null;
  discipline: string | null;
  gender: string | null;
  location: string | null;
};

export default function SummaryDatasetOnly() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ---- Build dataset (votes_single + users + option labels) ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) votes for this campaign
        const { data: voteRows, error: votesErr } = await supabase
          .from("votes_single")
          .select("option_id, voter_id, created_at")
          .eq("campaign_id", id);
        if (votesErr) throw votesErr;

        const votes = (voteRows ?? []).map((v: any) => ({
          option_id: String(v.option_id),
          voter_id: String(v.voter_id),
          created_at: v.created_at ? String(v.created_at) : null,
        }));

        if (!votes.length) {
          if (!cancelled) setDataset([]);
          return;
        }

        // 2) option labels (optional but helpful)
        const optionIds = Array.from(new Set(votes.map(v => v.option_id)));
        const { data: optRows, error: optErr } = await supabase
          .from("campaign_options")
          .select("id, label")
          .in("id", optionIds);
        if (optErr) throw optErr;

        const labelByOptionId = new Map<string, string | null>(
          (optRows ?? []).map((o: any) => [String(o.id), o.label ?? null])
        );

        // 3) demographics for these voters (only needed fields)
        const voterIds = Array.from(new Set(votes.map(v => v.voter_id)));
        const { data: userRows, error: usersErr } = await supabase
          .from("users")
          .select("auth_id, discipline, gender, location, ug_pg, grade")
          .in("auth_id", voterIds);
        if (usersErr) throw usersErr;

        const demoByAuthId = new Map<
          string,
          { discipline: string | null; gender: string | null; location: string | null; ug_pg: string | null; grade: string | null;}
        >(
          (userRows ?? []).map((u: any) => [
            String(u.auth_id),
            {
              discipline: u.discipline ?? null,
              gender: u.gender ?? null,
              location: u.location ?? null,
              ug_pg: u.ug_pg ?? null,
              grade: u.grade ?? null
            },
          ])
        );

        // 4) final dataset (one row per vote)
        const out: DatasetRow[] = votes.map(v => {
          const demo = demoByAuthId.get(v.voter_id);
          return {
            voter_id: v.voter_id,
            option_id: v.option_id,
            option_label: labelByOptionId.get(v.option_id) ?? null,
            created_at: v.created_at,
            discipline: demo?.discipline ?? null,
            gender: demo?.gender ?? null,
            location: demo?.location ?? null,
            ug_pg: demo?.ug_pg ?? null,
            grade: demo?.grade ?? null,
          };
        });

        if (!cancelled) setDataset(out);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dataset");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // ---- CSV helpers ----
  function toCsv(rows: any[], columns: { key: string; header: string }[]) {
    const escape = (val: any) => {
      const s = val == null ? "" : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = columns.map(c => escape(c.header)).join(",");
    const lines  = rows.map(r => columns.map(c => escape(r[c.key])).join(","));
    return "\uFEFF" + [header, ...lines].join("\n"); // BOM for Excel
  }

  function downloadCsv(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Export button ----
  const handleExport = () => {
    const columns = [
      { key: "voter_id",     header: "Voter ID" },
      { key: "option_id",    header: "Option ID" },
      { key: "option_label", header: "Option Label" },
      { key: "created_at",   header: "Created At" },
      { key: "discipline",   header: "Discipline" },
      { key: "gender",       header: "Gender" },
      { key: "location",     header: "Location" },
      { key: "ug_pg",        header: "UP/PG" },
      { key: "grade",        header: "Grade" },
    ];
    const csv = toCsv(dataset, columns);
    downloadCsv(csv, `poll_${id}_dataset.csv`);
    // Optional sanity logs
    console.log("CSV preview:\n", csv.split("\n").slice(0, 5).join("\n"));
    console.log("rows exported:", dataset.length);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleExport}
          disabled={loading || !!error}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
        >
          Export CSV
        </button>
        {!loading && <span className="text-xs text-muted-foreground">Rows: {dataset.length}</span>}
        {error && <span className="text-xs text-red-600">Error: {error}</span>}
      </div>
    </div>
  );
}
