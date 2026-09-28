import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save } from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  customer_key: string;
  customer_name: string | null;
  normalized_phone: string | null;
  tank_volume_liters: number | string | null;
  tank_dimensions: Record<string, unknown> | null;
  livestock: unknown[] | null;
  plants: unknown[] | null;
  filter_setup: Record<string, unknown> | null;
  heater_setup: Record<string, unknown> | null;
  water_profile: Record<string, unknown> | null;
  goals: unknown[] | null;
  notes: string | null;
  source: string;
  last_verified_at: string | null;
  orders_count: number | string;
};

type Draft = {
  tankVolumeLiters: string;
  livestock: string;
  plants: string;
  filter: string;
  heater: string;
  goals: string;
  notes: string;
};

const arrayText = (value: unknown[] | null | undefined) =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).join("، ") : "";

const objectDescription = (value: Record<string, unknown> | null | undefined) => {
  if (!value) return "";
  const preferred = value.description ?? value.name ?? value.model ?? value.legacyTankSize;
  return preferred == null ? "" : String(preferred);
};

function toDraft(profile: Profile): Draft {
  return {
    tankVolumeLiters: profile.tank_volume_liters == null ? "" : String(profile.tank_volume_liters),
    livestock: arrayText(profile.livestock),
    plants: arrayText(profile.plants),
    filter: objectDescription(profile.filter_setup),
    heater: objectDescription(profile.heater_setup),
    goals: arrayText(profile.goals),
    notes: profile.notes ?? "",
  };
}

function splitList(value: string): string[] {
  return value
    .split(/[،,\n]/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function last4(value: string | null) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? "••••" + digits.slice(-4) : "••••";
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "HTTP " + response.status);
  return body as T;
}

export function CustomerAquariumProfileManager() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");

  const profiles = useQuery<Profile[]>({
    queryKey: ["growth-os", "profiles"],
    queryFn: () => jsonFetch("/api/admin/growth-os/profiles?limit=150"),
  });

  const save = useMutation({
    mutationFn: async ({ customerKey, values }: { customerKey: string; values: Draft }) => {
      const parsedVolume = values.tankVolumeLiters.trim() ? Number(values.tankVolumeLiters) : null;
      return jsonFetch("/api/admin/growth-os/profiles/" + encodeURIComponent(customerKey), {
        method: "PUT",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          tankVolumeLiters: parsedVolume && parsedVolume > 0 ? parsedVolume : null,
          livestock: splitList(values.livestock),
          plants: splitList(values.plants),
          filterSetup: values.filter.trim() ? { description: values.filter.trim() } : {},
          heaterSetup: values.heater.trim() ? { description: values.heater.trim() } : {},
          goals: splitList(values.goals),
          notes: values.notes.trim() || null,
          source: "admin",
        }),
      });
    },
    onSuccess: async () => {
      setSelected(null);
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["growth-os", "profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["growth-os", "overview"] }),
      ]);
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles.data ?? [];
    return (profiles.data ?? []).filter((profile) =>
      String(profile.customer_name ?? "").toLowerCase().includes(q)
      || String(profile.customer_key ?? "").toLowerCase().includes(q)
      || String(profile.normalized_phone ?? "").includes(q.replace(/\D/g, "")),
    );
  }, [profiles.data, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">ملفات أحواض الزبائن</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              نخزن حجم الحوض والكائنات والمعدات حتى تكون المتابعة والتوصية حسب الحوض الحقيقي.
            </p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم أو الرقم"
            className="w-full sm:w-64"
          />
        </div>
      </CardHeader>
      <CardContent>
        {profiles.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل الملفات…</p>
        ) : (
          <div className="space-y-3">
            {rows.slice(0, 20).map((profile) => {
              const editing = selected === profile.customer_key;
              return (
                <div key={profile.customer_key} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{profile.customer_name || "زبون بدون اسم محفوظ"}</p>
                      <p className="text-xs text-muted-foreground">
                        {last4(profile.normalized_phone)} · {Number(profile.orders_count || 0)} طلب
                        {profile.tank_volume_liters ? " · " + profile.tank_volume_liters + " لتر" : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (editing) {
                          setSelected(null);
                          setDraft(null);
                        } else {
                          setSelected(profile.customer_key);
                          setDraft(toDraft(profile));
                        }
                      }}
                    >
                      <Pencil className="me-2 h-3.5 w-3.5" />
                      {editing ? "إلغاء" : "تعديل"}
                    </Button>
                  </div>

                  {editing && draft && (
                    <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
                      <div>
                        <Label>حجم الحوض باللتر</Label>
                        <Input
                          type="number"
                          min="1"
                          value={draft.tankVolumeLiters}
                          onChange={(event) => setDraft({ ...draft, tankVolumeLiters: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الأسماك / الكائنات</Label>
                        <Input
                          value={draft.livestock}
                          onChange={(event) => setDraft({ ...draft, livestock: event.target.value })}
                          placeholder="جوبي، نيون، روبيان…"
                        />
                      </div>
                      <div>
                        <Label>النباتات</Label>
                        <Input
                          value={draft.plants}
                          onChange={(event) => setDraft({ ...draft, plants: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الفلتر</Label>
                        <Input
                          value={draft.filter}
                          onChange={(event) => setDraft({ ...draft, filter: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label>السخان</Label>
                        <Input
                          value={draft.heater}
                          onChange={(event) => setDraft({ ...draft, heater: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الهدف / المشكلة</Label>
                        <Input
                          value={draft.goals}
                          onChange={(event) => setDraft({ ...draft, goals: event.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>ملاحظات</Label>
                        <Textarea
                          value={draft.notes}
                          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button
                          onClick={() => save.mutate({ customerKey: profile.customer_key, values: draft })}
                          disabled={save.isPending}
                        >
                          <Save className="me-2 h-4 w-4" />
                          حفظ ملف الحوض
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">ماكو نتائج.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
