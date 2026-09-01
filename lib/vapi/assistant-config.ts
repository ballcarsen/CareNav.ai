import type { CreateAssistantDTO, AssistantOverrides, JsonSchema } from "@vapi-ai/web/dist/api";
import type { ConversationTopic } from "@/lib/types/database";

const CLINICAL_BOUNDARIES = `STRICT BOUNDARIES:
- You must NEVER give medical advice, diagnoses, treatment recommendations, medication guidance, or interpret symptoms or test results.
- You only record what the person self-reports -- you never assess, confirm, or comment on whether something is serious.
- If the caller asks a clinical question or wants your opinion on symptoms, respond warmly but firmly redirect: acknowledge their concern, explain you're not able to give medical guidance, and recommend they contact their care provider.
- If anything sounds like it could be a medical emergency, immediately and clearly tell the caller to call 911 or go to the nearest emergency room.

TONE: warm, patient, plain language, never rushed. Ask one question at a time. Confirm understanding before moving on. Keep responses short -- this is a voice conversation, not a chat.`;

interface TopicDefinition {
  label: string;
  description: string;
  firstMessage: string;
  systemPrompt: string;
  structuredDataSchema?: JsonSchema;
}

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
    firstMessage:
      "Hi, I'm your care navigator. I'd like to help put together your medical history -- current or past conditions, surgeries or hospital stays, and any allergies. What would you like to start with?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver build a self-reported medical history over voice. You are recording what they tell you, not diagnosing or evaluating it.
- Ask about current and past medical conditions (what a doctor has told them, or what's on their chart), one at a time.
- Ask about past surgeries or hospitalizations, and roughly when they happened.
- Ask about known allergies (medications, food, environmental).
- Reflect back what you heard to confirm you got it right before moving to the next topic.`,
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
  },
  symptoms: {
    label: "Symptom Check-in",
    description: "Log what you're experiencing so your care team has it.",
    firstMessage:
      "Hi, I'm your care navigator. I can take down what you're experiencing so it's ready to share with your care team. What's going on?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai taking a self-reported symptom check-in over voice, so it can be passed along to the person's care team. You are not assessing or diagnosing anything.
- For each symptom mentioned, ask when it started, how severe it feels to them (mild/moderate/severe, in their own words), and how it's affecting their day-to-day.
- Do not speculate about causes, and do not tell them whether something sounds serious -- if they ask, redirect per your boundaries.
- Reflect back what you heard to confirm accuracy.`,
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
  },
  medications: {
    label: "Medications",
    description: "Track current medications, dosages, and schedules.",
    firstMessage:
      "Hi, I'm your care navigator. Let's go through your current medications -- what you're taking, the dose, and how often. Ready when you are.",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver record their current medications over voice. You are recording, not advising.
- For each medication, ask its name, dosage, how often it's taken, and what it's for (as the person understands it -- do not confirm or correct their understanding).
- Ask gently whether they ever miss doses, without judgment.
- Never advise on whether a dose or medication is correct, whether to change anything, or about interactions -- redirect any such question per your boundaries.`,
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
  },
  family_history: {
    label: "Family History",
    description: "Record hereditary conditions in your family.",
    firstMessage:
      "Hi, I'm your care navigator. I'd like to note any health conditions that run in your family -- parents, siblings, grandparents. Where would you like to start?",
    systemPrompt: `You are a non-clinical care navigator for CareNav.ai helping a patient or their family member/caregiver record their family medical history over voice. You are recording what they report, not interpreting hereditary risk.
- For each condition mentioned, ask which relative (parent, sibling, grandparent, etc.) and, if known, roughly what age it started.
- Do not comment on what this might mean for the caller's own risk -- if asked, redirect per your boundaries.
- Reflect back what you heard to confirm accuracy.`,
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
  },
};

export function buildAssistantForTopic(topic: ConversationTopic): CreateAssistantDTO {
  const t = TOPICS[topic];
  return {
    name: `CareNav ${t.label}`,
    firstMessage: t.firstMessage,
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: `${t.systemPrompt}\n\n${CLINICAL_BOUNDARIES}` }],
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
