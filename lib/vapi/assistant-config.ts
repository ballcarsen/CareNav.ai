import type {
  CreateAssistantDTO,
  AssistantOverrides,
  JsonSchema,
  OpenAIFunctionParameters,
} from "@vapi-ai/web/dist/api";
import type { ConversationTopic } from "@/lib/types/database";

const CLINICAL_BOUNDARIES = `STRICT BOUNDARIES:
- You must NEVER give medical advice, diagnoses, treatment recommendations, medication guidance, or interpret symptoms or test results.
- You only record what the person self-reports -- you never assess, confirm, or comment on whether something is serious.
- If the caller asks a clinical question or wants your opinion on symptoms, respond warmly but firmly redirect: acknowledge their concern, explain you're not able to give medical guidance, and recommend they contact their care provider.
- If anything sounds like it could be a medical emergency, immediately and clearly tell the caller to call 911 or go to the nearest emergency room.

TONE: warm, patient, plain language, never rushed. Ask one question at a time. Confirm understanding before moving on. Keep responses short -- this is a voice conversation, not a chat.`;

interface LiveToolDefinition {
  toolName: string;
  dataKey: string;
  description: string;
  itemSchema: OpenAIFunctionParameters;
  /** Field to match an incoming call against an already-recorded entry, so a
   * later call filling in more detail (e.g. dosage after just a name) updates
   * the existing card instead of adding a duplicate. Omit if entries can't
   * reasonably be deduped this way. */
  mergeKey?: string;
  /** If set, the single named argument is stored as a plain string (matching
   * the post-call schema's flat string array) instead of the whole object. */
  scalarField?: string;
}

interface TopicDefinition {
  label: string;
  description: string;
  firstMessage: string;
  systemPrompt: string;
  /** Heading for the live "captured so far" cards during a call on this topic. */
  liveCardsTitle?: string;
  structuredDataSchema?: JsonSchema;
  liveTools?: LiveToolDefinition[];
}

export const TOPIC_ORDER: ConversationTopic[] = [
  "general",
  "medical_history",
  "symptoms",
  "medications",
  "family_history",
];

export const TOPICS: Record<ConversationTopic, TopicDefinition> = {
  general: {
    label: "General",
    description: "Appointments, referrals, insurance, and finding resources.",
    firstMessage:
      "Hi, I'm your care navigator. I'm here to help with things like appointments, referrals, insurance questions, and finding resources. What can I help you with today?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai. You talk with patients and their family members/caregivers over voice, and help them with logistical and administrative healthcare tasks:
- Scheduling or rescheduling appointments
- Understanding and coordinating referrals
- Explaining insurance/benefits questions in plain language (coverage, copays, prior authorization steps -- not medical necessity judgments)
- Finding community resources (transportation assistance, financial assistance, support groups, home health services)
- Setting up follow-up reminders`,
  },
  medical_history: {
    label: "Medical History",
    description: "Build a record of your current and past conditions.",
    liveCardsTitle: "Medical history captured so far",
    firstMessage:
      "Hi, I'm your care navigator. I'd like to help put together your medical history -- current or past conditions, surgeries or hospital stays, and any allergies. What would you like to start with?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver build a self-reported medical history over voice. You are recording what they tell you, not diagnosing or evaluating it.
- Ask about current and past medical conditions (what a doctor has told them, or what's on their chart), one at a time.
- Ask about past surgeries or hospitalizations, and roughly when they happened.
- Ask about known allergies (medications, food, environmental).
- Reflect back what you heard to confirm you got it right before moving to the next topic.
- Whenever the caller states a condition, an allergy, or a past surgery/hospitalization, immediately call the matching record_* tool with that fact, in addition to responding normally.`,
    structuredDataSchema: {
      type: "object",
      properties: {
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              status: { type: "string", enum: ["active", "past", "managed"] },
              notes: { type: "string" },
            },
          },
        },
        allergies: { type: "array", items: { type: "string" } },
        pastSurgeriesOrHospitalizations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              year: { type: "string" },
            },
          },
        },
      },
    },
    liveTools: [
      {
        toolName: "record_condition",
        dataKey: "conditions",
        description: "Record a single current or past medical condition the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            status: { type: "string", enum: ["active", "past", "managed"] },
            notes: { type: "string" },
          },
          required: ["name"],
        },
        mergeKey: "name",
      },
      {
        toolName: "record_allergy",
        dataKey: "allergies",
        description: "Record a single allergy the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            allergy: { type: "string" },
          },
          required: ["allergy"],
        },
        scalarField: "allergy",
      },
      {
        toolName: "record_surgery_or_hospitalization",
        dataKey: "pastSurgeriesOrHospitalizations",
        description: "Record a single past surgery or hospitalization the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            description: { type: "string" },
            year: { type: "string" },
          },
          required: ["description"],
        },
        mergeKey: "description",
      },
    ],
  },
  symptoms: {
    label: "Symptom Check-in",
    description: "Log what you're experiencing so your care team has it.",
    liveCardsTitle: "Symptoms captured so far",
    firstMessage:
      "Hi, I'm your care navigator. I can take down what you're experiencing so it's ready to share with your care team. What's going on?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai taking a self-reported symptom check-in over voice, so it can be passed along to the person's care team. You are not assessing or diagnosing anything.
- For each symptom mentioned, ask when it started, how severe it feels to them (mild/moderate/severe, in their own words), and how it's affecting their day-to-day.
- Do not speculate about causes, and do not tell them whether something sounds serious -- if they ask, redirect per your boundaries.
- Reflect back what you heard to confirm accuracy.
- Whenever the caller describes a symptom, immediately call the record_symptom tool with what you have so far, in addition to responding normally.`,
    structuredDataSchema: {
      type: "object",
      properties: {
        symptoms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              onset: { type: "string" },
              severity: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
    },
    liveTools: [
      {
        toolName: "record_symptom",
        dataKey: "symptoms",
        description: "Record a single symptom the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            description: { type: "string" },
            onset: { type: "string" },
            severity: { type: "string" },
            notes: { type: "string" },
          },
          required: ["description"],
        },
        mergeKey: "description",
      },
    ],
  },
  medications: {
    label: "Medications",
    description: "Track current medications, dosages, and schedules.",
    liveCardsTitle: "Medications captured so far",
    firstMessage:
      "Hi, I'm your care navigator. Let's go through your current medications -- what you're taking, the dose, and how often. Ready when you are.",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver record their current medications over voice. You are recording, not advising.
- For each medication, ask its name, dosage, how often it's taken, and what it's for (as the person understands it -- do not confirm or correct their understanding).
- Ask gently whether they ever miss doses, without judgment.
- Never advise on whether a dose or medication is correct, whether to change anything, or about interactions -- redirect any such question per your boundaries.
- Whenever the caller states a medication's name (and any dosage/frequency/purpose they give), immediately call the record_medication tool, in addition to responding normally.`,
    structuredDataSchema: {
      type: "object",
      properties: {
        medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              purpose: { type: "string" },
            },
          },
        },
      },
    },
    liveTools: [
      {
        toolName: "record_medication",
        dataKey: "medications",
        description: "Record a single medication the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            dosage: { type: "string" },
            frequency: { type: "string" },
            purpose: { type: "string" },
          },
          required: ["name"],
        },
        mergeKey: "name",
      },
    ],
  },
  family_history: {
    label: "Family History",
    description: "Record hereditary conditions in your family.",
    liveCardsTitle: "Family history captured so far",
    firstMessage:
      "Hi, I'm your care navigator. I'd like to note any health conditions that run in your family -- parents, siblings, grandparents. Where would you like to start?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver record their family medical history over voice. You are recording what they report, not interpreting hereditary risk.
- For each condition mentioned, ask which relative (parent, sibling, grandparent, etc.) and, if known, roughly what age it started.
- Do not comment on what this might mean for the caller's own risk -- if asked, redirect per your boundaries.
- Reflect back what you heard to confirm accuracy.
- Whenever the caller states a family member's condition, immediately call the record_family_history_entry tool with that fact, in addition to responding normally.`,
    structuredDataSchema: {
      type: "object",
      properties: {
        familyHistory: {
          type: "array",
          items: {
            type: "object",
            properties: {
              relation: { type: "string" },
              condition: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
    },
    liveTools: [
      {
        toolName: "record_family_history_entry",
        dataKey: "familyHistory",
        description: "Record a single family medical history entry the caller reported.",
        itemSchema: {
          type: "object",
          properties: {
            relation: { type: "string" },
            condition: { type: "string" },
            notes: { type: "string" },
          },
          required: ["condition"],
        },
        mergeKey: "condition",
      },
    ],
  },
};

export interface ToolLiveMeta {
  dataKey: string;
  mergeKey?: string;
  scalarField?: string;
}

// Flattened tool name -> routing/merge info, so the client can process an
// incoming tool call into the right array without knowing which topic it's for.
export const TOOL_LIVE_META: Record<string, ToolLiveMeta> = Object.fromEntries(
  Object.values(TOPICS).flatMap(
    (t) =>
      t.liveTools?.map((lt) => [
        lt.toolName,
        { dataKey: lt.dataKey, mergeKey: lt.mergeKey, scalarField: lt.scalarField },
      ]) ?? [],
  ),
);

// Per-topic dataKey -> mergeKey, so cross-call aggregation can dedupe/merge
// entries the same way live tool-call accumulation does.
export const DATA_KEY_MERGE_KEYS: Partial<Record<ConversationTopic, Record<string, string>>> =
  Object.fromEntries(
    (Object.entries(TOPICS) as [ConversationTopic, TopicDefinition][]).map(([topic, t]) => [
      topic,
      Object.fromEntries(
        (t.liveTools ?? []).filter((lt) => lt.mergeKey).map((lt) => [lt.dataKey, lt.mergeKey!]),
      ),
    ]),
  );

export function buildAssistantForTopic(topic: ConversationTopic): CreateAssistantDTO {
  const t = TOPICS[topic];
  return {
    name: `CareNav ${t.label}`,
    firstMessage: t.firstMessage,
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: `${t.systemPrompt}\n\n${CLINICAL_BOUNDARIES}` }],
      ...(t.liveTools
        ? {
            tools: t.liveTools.map((lt) => ({
              type: "function" as const,
              async: true,
              function: {
                name: lt.toolName,
                description: lt.description,
                parameters: lt.itemSchema,
              },
            })),
          }
        : {}),
    },
    voice: {
      provider: "11labs",
      voiceId: "sarah",
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    ...(t.structuredDataSchema
      ? { analysisPlan: { structuredDataPlan: { enabled: true, schema: t.structuredDataSchema } } }
      : {}),
  };
}

export function buildAssistantOverrides(userId: string, conversationId: string): AssistantOverrides {
  return {
    metadata: { userId, conversationId },
  };
}
