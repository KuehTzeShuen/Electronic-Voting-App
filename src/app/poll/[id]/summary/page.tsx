"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";

type DatasetRow = {
  voter_id: string;
  option_id: string;
  option_label: string | null;
  created_at: string | null;
  discipline: string | null;
  gender: string | null;
  location: string | null;
  ug_pg?: string | null;
};

type Campaign = {
  id: string;
  label: string | null;
};

export default function SummaryDatasetOnly() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [dataset, setDataset] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // ---- Build dataset (votes_single + users + option labels) ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 0) Fetch campaign meta so we can show the title
        const { data: camp, error: campErr } = await supabase
          .from("campaigns")
          .select("id, title")
          .eq("id", id)
          .maybeSingle();
        if (campErr) throw campErr;
        if (camp) setCampaign({ id: camp.id, label: camp.title });

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

        // 2) option labels
        const optionIds = Array.from(new Set(votes.map(v => v.option_id)));
        const { data: optRows, error: optErr } = await supabase
          .from("campaign_options")
          .select("id, label")
          .in("id", optionIds);
        if (optErr) throw optErr;

        const labelByOptionId = new Map<string, string | null>(
          (optRows ?? []).map((o: any) => [String(o.id), o.label ?? null])
        );

        // 3) demographics for these voters
        const voterIds = Array.from(new Set(votes.map(v => v.voter_id)));
        const { data: userRows, error: usersErr } = await supabase
          .from("users")
          .select("auth_id, discipline, gender, location, ug_pg")
          .in("auth_id", voterIds);
        if (usersErr) throw usersErr;

        const demoByAuthId = new Map<
          string,
          { discipline: string | null; gender: string | null; location: string | null; ug_pg: string | null; }
        >(
          (userRows ?? []).map((u: any) => [
            String(u.auth_id),
            {
              discipline: u.discipline ?? null,
              gender: u.gender ?? null,
              location: u.location ?? null,
              ug_pg: u.ug_pg ?? null,
            },
          ])
        );

        // 4) final dataset
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
          };
        });

        if (!cancelled) setDataset(out);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dataset");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---- Aggregate counts per option ----

  const countsByOption = useMemo(() => {
    const m = new Map<string, { label: string; cnt: number }>();
    for (const row of dataset) {
      const key = row.option_id;
      const label = row.option_label ?? row.option_id;
      if (!m.has(key)) m.set(key, { label, cnt: 0 });
      m.get(key)!.cnt += 1;
    }
    return Array.from(m.values()).sort((a, b) => b.cnt - a.cnt);
  }, [dataset]);

  const totalVotes = countsByOption.reduce((sum, d) => sum + d.cnt, 0);

  const maxCnt = useMemo(() => (countsByOption[0]?.cnt ?? 0), [countsByOption]);
  const winners = useMemo(() => {
    if (!countsByOption.length) return [];
    return countsByOption.filter(d => d.cnt === maxCnt).map(d => d.label);
  }, [countsByOption, maxCnt]);

  // ----- Location helpers -----
  const locationMap: Record<string, string> = {
    "1": "Clayton",
    "2": "Caulfield",
    "3": "Peninsula",
    "4": "Parkville",
    "5": "Malaysia",
    "6": "Other",
  };
  const normLocation = (val?: number | string | null) => {
    if (val == null || val === "" || val === "NA") return "NA";
    return locationMap[String(val)] ?? "Other";
  };
  const locationColors: Record<string, string> = {
    Clayton: "#60a5fa",
    Caulfield: "#34d399",
    Peninsula: "#fbbf24",
    Parkville: "#f472b6",
    Malaysia: "#a78bfa",
    Other: "#f97316",
    NA: "#9ca3af",
  };


  // ---- Candidate filter state (NEW) ----
  const optionLabels = useMemo(() => {
    const s = new Set<string>();
    for (const r of dataset) s.add((r.option_label ?? r.option_id) || "Unknown");
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [dataset]);

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  useEffect(() => {
    // init: select all when dataset changes
    setSelectedOptions(new Set(optionLabels));
  }, [optionLabels]);

  const toggleOption = (label: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedOptions(prev =>
      prev.size === optionLabels.length ? new Set() : new Set(optionLabels)
    );
  };

  // Overall Location — FILTERED by selected candidates (NEW)
  const overallLocationFiltered = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of dataset) {
      const opt = (r.option_label ?? r.option_id) || "Unknown";
      if (!selectedOptions.has(opt)) continue;
      const loc = normLocation(r.location);
      m.set(loc, (m.get(loc) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([location, cnt]) => ({ location, cnt }));
  }, [dataset, selectedOptions]);

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
  
  // ----- Discipline helpers -----
  const disciplineMap: Record<string, string> = {
    "1": "Arts, Design and Architecture",
    "2": "Arts",
    "3": "Business and Economics",
    "4": "Education",
    "5": "Engineering",
    "6": "Information Technology",
    "7": "Law",
    "8": "Medicine, Nursing and Health Sciences",
    "9": "Pharmacy and Pharmaceutical Sciences",
    "10": "Science",
  };

  const normDiscipline = (val?: number | string | null) => {
    if (val == null || val === "" || val === "NA") return "NA";
    return disciplineMap[String(val)] ?? "NA";
  };

  // A readable palette for disciplines (+ NA)
  const disciplineColors: Record<string, string> = {
    "Arts, Design and Architecture": "#f59e0b", // amber
    "Arts":                          "#60a5fa", // blue
    "Business and Economics":        "#34d399", // green
    "Education":                     "#f472b6", // pink
    "Engineering":                   "#fb7185", // rose
    "Information Technology":        "#a78bfa", // purple
    "Law":                           "#f97316", // orange
    "Medicine, Nursing and Health Sciences": "#22d3ee", // cyan
    "Pharmacy and Pharmaceutical Sciences":  "#84cc16", // lime
    "Science":                       "#fbbf24", // yellow
    "NA":                            "#9ca3af", // gray
  };

  // Overall Discipline Distribution (FILTERED by selected candidates)
  const overallDisciplineFiltered = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of dataset) {
      const opt = (r.option_label ?? r.option_id) || "Unknown";
      if (!selectedOptions.has(opt)) continue;     // reuse the candidate filter
      const d = normDiscipline(r.discipline);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    // Stable order: keep the numeric order 1..10, then NA at end
    const rows = Array.from(m.entries()).map(([discipline, cnt]) => ({ discipline, cnt }));
    const order = Object.values(disciplineMap); // [mapped order 1..10]
    rows.sort((a, b) => {
      const ia = order.indexOf(a.discipline);
      const ib = order.indexOf(b.discipline);
      // Put unknown/NA at the end
      if (ia === -1 && ib === -1) return a.discipline.localeCompare(b.discipline);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return rows;
  }, [dataset, selectedOptions]);

  const totalByDiscipline = useMemo(
  () => overallDisciplineFiltered.reduce((s, d) => s + d.cnt, 0),
  [overallDisciplineFiltered]
  );

  const totalByLocation = useMemo(
  () => overallLocationFiltered.reduce((s, d) => s + d.cnt, 0),
  [overallLocationFiltered]
  );

  // --- Gender Pie (Male/Female/Other-NA) ---

  const filteredDataset = useMemo(
    () =>
      dataset.filter(r =>
        selectedOptions.has((r.option_label ?? r.option_id) || "Unknown")
      ),
    [dataset, selectedOptions]
  );
  const genderPieData = useMemo(() => {
    let male = 0, female = 0, other = 0, na = 0;
    for (const r of filteredDataset) {
      const g = (r.gender ?? "").trim().toLowerCase();
      if (g === "male") male += 1;
      else if (g === "female") female += 1;
      else if (g === "other") other += 1;
      else na += 1
    }
    return [
      { name: "Female", value: female },
      { name: "Male", value: male },
      { name: "Other", value: other },
      { name: "NA", value: na },
    ];
  }, [filteredDataset]);

  const genderPieTotal = useMemo(
    () => genderPieData.reduce((s, d) => s + d.value, 0),
    [genderPieData]
  );

  const genderPieColors: Record<string, string> = {
    Female: "#f472b6",   // pink
    Male: "#60a5fa",     // blue
    Other: "#34d399",
    NA : "#9ca3af", // gray
  };

  // --- UG/PG Pie ---
  const ugpgPieData = useMemo(() => {
    let ug = 0, pg = 0, na = 0;
    for (const r of filteredDataset) {
      const v = (r.ug_pg ?? "").trim().toUpperCase();
      if (v === "UG" || v === "UNDERGRAD" || v === "UNDERGRADUATE") ug += 1;
      else if (v === "PG" || v === "POSTGRAD" || v === "POSTGRADUATE") pg += 1;
      else na += 1; // includes empty or anything else
    }
    return [
      { name: "UG", value: ug },
      { name: "PG", value: pg },
      { name: "NA", value: na },
    ];
  }, [filteredDataset]);

  const ugpgPieTotal = useMemo(
    () => ugpgPieData.reduce((s, d) => s + d.value, 0),
    [ugpgPieData]
  );

  const ugpgPieColors: Record<string, string> = {
    UG: "#34d399", // green
    PG: "#a78bfa", // purple
    NA: "#9ca3af", // gray
  };


  function downloadCsv(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const CustomTooltip = ({ active, payload, label, total }: any) => {
    if (!active || !payload || !payload.length) return null;

    const value = Number(payload[0].value) || 0;
    const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";

    return (
      <div
        style={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: "6px 8px",
          color: "white",
        }}
      >
        <div className="font-medium">{label}</div>
        <div>
          {value} ({pct}%)
        </div>
      </div>
    );
  };


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
      { key: "ug_pg",        header: "UG/PG" },
    ];
    const csv = toCsv(dataset, columns);
    downloadCsv(csv, `poll_${id}_dataset.csv`);
  };

  return (
    <div className="p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: Title */}
        <div>
          <h1 className="text-xl font-semibold">
            Results for {campaign?.label ?? "Campaign"}
          </h1>
        </div>
        {/* Right: Export + info */}
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-xs text-muted-foreground">
              Rows: {dataset.length}
            </span>
          )}
          {error && (
            <span className="text-xs text-red-600">Error: {error}</span>
          )}
          <button
            onClick={handleExport}
            disabled={loading || !!error}
            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <hr className="my-4 border-gray-300" />

      <p className="text-xl text-muted-foreground">
        🏆 Winner: <span className="text-primary">{winners[0]}</span> ({maxCnt} votes)
      </p>

      {/* Winner Bar Chart */}
      {!loading && countsByOption.length > 0 && (
        <div>
          <div className="border border-gray-300 rounded-lg p-4 shadow-sm bg-transparent">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={countsByOption}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="label" stroke="white" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip total = {totalVotes} />} cursor={false} />
                <Bar dataKey="cnt" radius={[6, 6, 0, 0]}>
                  {countsByOption.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#fbbf24" : "#4f46e5"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-lg font-semibold mt-2">Demographic Breakdown</p>

      <h2 className="text-base font-medium mt-6 mb-3">Candidate Filter for plots below</h2>
      {/* Candidate filter controls */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleAll}
            className="px-2 py-1 text-xs rounded border border-gray-600/30 hover:bg-white/5"
          >
            {selectedOptions.size === optionLabels.length ? "Unselect all" : "Select all"}
          </button>
          <span className="text-xs text-muted-foreground">
            Showing {selectedOptions.size}/{optionLabels.length} candidates
          </span>
        </div>
        <div className="flex flex-wrap gap-3 max-h-28 overflow-auto border border-gray-700/30 rounded-md p-2">
          {optionLabels.map(label => (
            <label key={label} className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={selectedOptions.has(label)}
                onChange={() => toggleOption(label)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Overall Location Distribution + Candidate Filter */}
      <h3 className="text-base font-medium mt-6 mb-2">2 - Overall Location Distribution</h3>

      <div className="border border-gray-300 rounded-lg p-4 shadow-sm bg-transparent">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={overallLocationFiltered}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="location" type="category" stroke="white" />
            <Tooltip
              cursor={false}
              content = {<CustomTooltip total={totalByLocation} />}
            />
            <Bar dataKey="cnt" radius={[0, 6, 6, 0]}>
              {overallLocationFiltered.map((d, i) => (
                <Cell key={i} fill={locationColors[d.location] ?? "#ccc"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-base font-medium mt-6 mb-2">3 - Overall Discipline Distribution</h3>

      <div className="border border-gray-300 rounded-lg p-4 shadow-sm bg-transparent">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={overallDisciplineFiltered}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="discipline" type="category" stroke="white" width={220} />
            <Tooltip
              cursor={false}
              content = {<CustomTooltip total={totalByDiscipline} />}
            />
            <Bar dataKey="cnt" radius={[0, 6, 6, 0]}>
              {overallDisciplineFiltered.map((d, i) => (
                <Cell key={i} fill={disciplineColors[d.discipline] ?? "#ccc"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two pies in one row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gender Pie */}
        <div className="border border-gray-300 rounded-lg p-4 shadow-sm bg-transparent">
          <h3 className="text-base font-medium mb-2">4 - Gender Proportion</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={genderPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                isAnimationActive={false}
                 label={({ name, percent, value }: any) =>
                          value > 0 ? `${name} ${value} (${(percent * 100).toFixed(0)}%)` : ""
                        }
                labelLine={false}
              >
                {genderPieData.map((d, i) => (
                  <Cell key={i} fill={genderPieColors[d.name] ?? "#ccc"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* UG / PG Pie */}
        <div className="border border-gray-300 rounded-lg p-4 shadow-sm bg-transparent">
          <h3 className="text-base font-medium mb-2">5 - UG / PG Proportion</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ugpgPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                isAnimationActive={false}
                 label={({ name, percent, value }: any) =>
                          value > 0 ? `${name} ${value} (${(percent * 100).toFixed(0)}%)` : ""
                        }
                labelLine={false}
              >
                {ugpgPieData.map((d, i) => (
                  <Cell key={i} fill={ugpgPieColors[d.name] ?? "#ccc"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
