import { DATA_KEY_MERGE_KEYS } from "@/lib/vapi/assistant-config";
import type { ConversationTopic } from "@/lib/types/database";

/**
 * Folds `incoming` into `existing`. Plain-string entries (e.g. allergies) are
 * deduped by value; object entries are merged by `mergeKey` (case-insensitive)
 * so a later, more detailed entry (e.g. a medication with dosage added after
 * just its name) updates the same item instead of adding a duplicate.
 */
export function mergeStructuredDataArrays(
  existing: unknown[],
  incoming: unknown[],
  mergeKey?: string,
): unknown[] {
  const result = [...existing];

  for (const item of incoming) {
    if (typeof item === "string") {
      if (!result.includes(item)) result.push(item);
      continue;
    }

    if (mergeKey && item && typeof item === "object") {
      const key = (item as Record<string, unknown>)[mergeKey];
      if (typeof key === "string" && key.trim()) {
        const index = result.findIndex((existingItem) => {
          if (!existingItem || typeof existingItem !== "object") return false;
          const existingKey = (existingItem as Record<string, unknown>)[mergeKey];
          return typeof existingKey === "string" && existingKey.trim().toLowerCase() === key.trim().toLowerCase();
        });
        if (index !== -1) {
          result[index] = { ...(result[index] as Record<string, unknown>), ...item };
          continue;
        }
      }
    }

    result.push(item);
  }

  return result;
}

/** Folds multiple conversations' `structured_data` blobs (newest-first or any
 * order) into one combined view for a topic. */
export function mergeStructuredDataBlobs(
  topic: ConversationTopic,
  blobs: Record<string, unknown>[],
): Record<string, unknown> {
  const mergeKeys = DATA_KEY_MERGE_KEYS[topic] ?? {};
  const merged: Record<string, unknown[]> = {};

  for (const blob of blobs) {
    for (const [dataKey, value] of Object.entries(blob)) {
      if (!Array.isArray(value)) continue;
      merged[dataKey] = mergeStructuredDataArrays(merged[dataKey] ?? [], value, mergeKeys[dataKey]);
    }
  }

  return merged;
}
