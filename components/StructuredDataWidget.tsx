import type { ConversationTopic } from "@/lib/types/database";

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "active" | "past" | "managed" }) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300",
    active: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
    past: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
    managed: "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
  };
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 ${toneClasses[tone]}`}>{children}</span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <span className="text-xs text-stone-500 dark:text-stone-400">
      {label}: <span className="text-stone-700 dark:text-stone-200">{value}</span>
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 dark:border-white/10 p-3 flex flex-col gap-1">
      {children}
    </div>
  );
}

function EmptyState() {
  return <p className="text-sm text-stone-500 dark:text-stone-400">Nothing extracted for this call.</p>;
}

interface Condition {
  name?: string;
  status?: "active" | "past" | "managed" | string;
  notes?: string;
}
interface SurgeryOrHospitalization {
  description?: string;
  year?: string;
}
function MedicalHistoryWidget({ data }: { data: Record<string, unknown> }) {
  const conditions = Array.isArray(data.conditions) ? (data.conditions as Condition[]) : [];
  const allergies = Array.isArray(data.allergies) ? (data.allergies as string[]) : [];
  const surgeries = Array.isArray(data.pastSurgeriesOrHospitalizations)
    ? (data.pastSurgeriesOrHospitalizations as SurgeryOrHospitalization[])
    : [];

  if (conditions.length === 0 && allergies.length === 0 && surgeries.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-4">
      {conditions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Conditions
          </h3>
          {conditions.map((c, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{c.name ?? "Unnamed condition"}</span>
                {c.status && (
                  <Pill tone={["active", "past", "managed"].includes(c.status) ? (c.status as "active" | "past" | "managed") : "neutral"}>
                    {c.status}
                  </Pill>
                )}
              </div>
              {c.notes && <p className="text-xs text-stone-500 dark:text-stone-400">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {allergies.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Allergies
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((a, i) => (
              <Pill key={i}>{typeof a === "string" ? a : JSON.stringify(a)}</Pill>
            ))}
          </div>
        </div>
      )}

      {surgeries.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Surgeries &amp; hospitalizations
          </h3>
          {surgeries.map((s, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{s.description ?? "Unspecified"}</span>
                {s.year && <span className="text-xs text-stone-500 dark:text-stone-400">{s.year}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface Symptom {
  description?: string;
  onset?: string;
  severity?: string;
  notes?: string;
}
function SymptomsWidget({ data }: { data: Record<string, unknown> }) {
  const symptoms = Array.isArray(data.symptoms) ? (data.symptoms as Symptom[]) : [];
  if (symptoms.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-2">
      {symptoms.map((s, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{s.description ?? "Unnamed symptom"}</span>
            {s.severity && <Pill tone="active">{s.severity}</Pill>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Field label="Onset" value={s.onset} />
          </div>
          {s.notes && <p className="text-xs text-stone-500 dark:text-stone-400">{s.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

interface Medication {
  name?: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
}
function MedicationsWidget({ data }: { data: Record<string, unknown> }) {
  const medications = Array.isArray(data.medications) ? (data.medications as Medication[]) : [];
  if (medications.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-2">
      {medications.map((m, i) => (
        <Card key={i}>
          <span className="text-sm font-medium">{m.name ?? "Unnamed medication"}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Field label="Dosage" value={m.dosage} />
            <Field label="Frequency" value={m.frequency} />
            <Field label="Purpose" value={m.purpose} />
          </div>
        </Card>
      ))}
    </div>
  );
}

interface FamilyHistoryEntry {
  relation?: string;
  condition?: string;
  notes?: string;
}
function FamilyHistoryWidget({ data }: { data: Record<string, unknown> }) {
  const entries = Array.isArray(data.familyHistory) ? (data.familyHistory as FamilyHistoryEntry[]) : [];
  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{e.condition ?? "Unspecified condition"}</span>
            {e.relation && <Pill>{e.relation}</Pill>}
          </div>
          {e.notes && <p className="text-xs text-stone-500 dark:text-stone-400">{e.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

export function StructuredDataWidget({
  topic,
  data,
}: {
  topic: ConversationTopic;
  data: Record<string, unknown>;
}) {
  switch (topic) {
    case "medical_history":
      return <MedicalHistoryWidget data={data} />;
    case "symptoms":
      return <SymptomsWidget data={data} />;
    case "medications":
      return <MedicationsWidget data={data} />;
    case "family_history":
      return <FamilyHistoryWidget data={data} />;
    default:
      return (
        <pre className="text-xs whitespace-pre-wrap break-words text-stone-600 dark:text-stone-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}
