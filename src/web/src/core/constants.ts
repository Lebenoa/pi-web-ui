import type { ModelInfo } from "./types";

export const VALID_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_IMAGE_DIM = 2048;
/** Thinking selectors in the agent's display order (canonical superset). */
export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

/**
 * Thinking selectors valid for the active model: "off" plus the model's
 * declared effort ladder. Models without effort metadata keep the full
 * ladder; non-reasoning models only get "off".
 */
export function getSupportedThinkingLevels(model: Pick<ModelInfo, "reasoning" | "thinking"> | null | undefined): string[] {
  if (!model || model.reasoning === false) return ["off"];
  const efforts = model.thinking?.efforts;
  if (!Array.isArray(efforts) || efforts.length === 0) return THINKING_LEVELS;
  return ["off", ...efforts];
}
