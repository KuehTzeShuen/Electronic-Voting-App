import { generateUUID } from "@/lib/uuid";

type OptionRow = {
  id: string;
  campaign_id: string;
  label: string;
  description: string | null;
};

export default function ManageOptionsPage() {
  const params = useParams();
  const campaignId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Prefer role chosen at login (localStorage) to avoid student flash
        try {
          const stored = typeof window !== "undefined" ? localStorage.getItem("appRole") : null;
          if (stored === "admin" || stored === "student") setRole(stored);
        } catch {}

        // Validate against profile, scoped if a chosen role exists
        const { data: session } = await supabase.auth.getUser();
        const email = session.user?.email;
        const chosen = (typeof window !== "undefined" ? localStorage.getItem("appRole") : null) as
          | "admin"
          | "student"
          | null;
        if (email) {
          const base = supabase.from("users").select("role").eq("email", email).limit(1);
          const { data: roleRow } = chosen
            ? await base.eq("role", chosen).maybeSingle()
            : await base.maybeSingle();
          if (roleRow?.role === "admin" || roleRow?.role === "student") {
            if (!chosen) setRole(roleRow.role);
          }
        }

        // load existing options
        const { data } = await supabase
          .from("campaign_options")
          .select("id, campaign_id, label, description")
          .eq("campaign_id", campaignId)
          .order("label", { ascending: true });
        if (Array.isArray(data)) setOptions(data as OptionRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId]);

  const addOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (role !== "admin") throw new Error("Only admins can add options");
      const payload = {
        id: generateUUID(),
        campaign_id: campaignId,
        label: label.trim(),
        description: desc.trim() || null,
      };
      if (!payload.label) throw new Error("Label is required");
      const { error } = await supabase.from("campaign_options").insert(payload);
      if (error) throw error;
      setLabel("");
      setDesc("");
      // reload options
      const { data } = await supabase
        .from("campaign_options")
        .select("id, campaign_id, label, description")
        .eq("campaign_id", campaignId)
        .order("label", { ascending: true });
      if (Array.isArray(data)) setOptions(data as OptionRow[]);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: unknown }).message) : 'Failed to add option';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <div className="h-20 rounded-xl bg-muted animate-pulse mb-3" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8">
        <p className="text-sm text-muted-foreground">Only admins can manage options.</p>
        <Button className="mt-4" onClick={() => router.push("/polling-menu")}>Back to polling menu</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <Card className="w-full max-w-xl mx-auto border-muted/40 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Manage options</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={addOption} className="flex flex-col gap-3 mb-6">
            <div>
              <label className="block text-sm mb-1">Label</label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Candidate name" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Description (optional)</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add option"}</Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/polling-menu")}>Back to polling menu</Button>
            </div>
          </form>

          <div className="space-y-2">
            {options.length === 0 && (
              <div className="text-sm text-muted-foreground">No options yet.</div>
            )}
            {options.map((o) => (
              <div key={o.id} className="rounded-md border border-border px-3 py-2">
                <div className="text-sm font-medium text-foreground">{o.label}</div>
                {o.description && <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


