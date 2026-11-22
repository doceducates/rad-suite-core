/**
 * Subtractive Slot-Based Template Merger Engine
 * Deterministically suppresses normal sentences when abnormal findings are dictated.
 * 100% deterministic code without LLM hallucination risk.
 */
import { SlotTemplate, SlotMergeResult } from '@/types/slot-templates';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  const clean = stripHtml(text);
  return clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export function mergeFindingsWithSlots(
  template: SlotTemplate,
  dictatedText: string,
  mode: 'suppress' | 'strikethrough' = 'suppress'
): SlotMergeResult {
  const dictatedSentences = splitSentences(dictatedText);
  const matchedSentences = new Set<number>();
  let suppressedCount = 0;

  const activeSlots: SlotMergeResult['activeSlots'] = [];

  for (const slot of template.slots) {
    const slotMatches: string[] = [];

    // Find any dictated sentences matching this organ slot's keywords
    dictatedSentences.forEach((sentence, idx) => {
      const lower = sentence.toLowerCase();
      const isMatch = slot.keywords.some((kw) => {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(lower);
      });

      if (isMatch) {
        slotMatches.push(sentence);
        matchedSentences.add(idx);
      }
    });

    if (slotMatches.length > 0) {
      suppressedCount++;
      activeSlots.push({
        slotId: slot.slotId,
        organName: slot.organName,
        status: 'replaced',
        text: slotMatches.join(' '),
        originalNormal: slot.normalText,
      });
    } else {
      activeSlots.push({
        slotId: slot.slotId,
        organName: slot.organName,
        status: 'normal',
        text: slot.normalText,
      });
    }
  }

  // Any dictated sentences that did not match pre-defined slots
  const unslottedFindings = dictatedSentences
    .filter((_, idx) => !matchedSentences.has(idx))
    .join(' ');

  // Render HTML paragraphs
  const htmlParts: string[] = [];

  for (const slot of activeSlots) {
    if (slot.status === 'replaced') {
      if (mode === 'strikethrough' && slot.originalNormal) {
        htmlParts.push(
          `<p><span class="line-through opacity-50 text-zinc-400 dark:text-zinc-500">${slot.originalNormal}</span></p>`
        );
      }
      htmlParts.push(`<p><strong class="text-primary">${slot.text}</strong></p>`);
    } else {
      htmlParts.push(`<p>${slot.text}</p>`);
    }
  }

  if (unslottedFindings) {
    htmlParts.push(`<p><strong class="text-primary">${unslottedFindings}</strong></p>`);
  }

  return {
    technique: template.technique,
    findingsHtml: htmlParts.join(''),
    activeSlots,
    suppressedNormalsCount: suppressedCount,
  };
}
