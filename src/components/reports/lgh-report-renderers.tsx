import React from 'react';

/**
 * Renders structured clinical findings with bold headings and clean paragraph spacing.
 * Handles both rich HTML (e.g. from TipTap) and plain text with "• Heading:" anatomical bullets.
 */
export function renderStructuredClinicalFindings(raw: string) {
  if (!raw) {
    return <p className="text-slate-700 italic">No acute focal intracranial abnormality or gross trauma identified.</p>;
  }

  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return (
      <div
        className="space-y-1.5 text-slate-900 leading-relaxed text-[13px] sm:text-[13.5px] [&_strong]:font-bold [&_strong]:text-slate-950 [&_p]:leading-relaxed [&_ul]:space-y-1 [&_li]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5 text-slate-900 leading-relaxed text-[13px] sm:text-[13.5px]">
      {lines.map((line, idx) => {
        const colonMatch = line.match(/^([•\-\*]?\s*)([^:\n]{2,70}:)([\s\S]*)$/);
        if (colonMatch) {
          const bullet = colonMatch[1];
          const label = colonMatch[2];
          const body = colonMatch[3];
          return (
            <p key={idx} className="leading-relaxed">
              {bullet && <span className="font-bold text-slate-950 mr-1">{bullet}</span>}
              <strong className="font-bold text-slate-950 text-[13.5px]">{label}</strong>
              <span className="text-slate-800">{body}</span>
            </p>
          );
        }
        return (
          <p key={idx} className="leading-relaxed text-slate-800">
            {line}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Renders structured clinical impressions with bold bulleted conclusions.
 */
export function renderStructuredImpression(raw: string) {
  if (!raw) return <p className="font-bold text-slate-950">• No acute pathology identified.</p>;
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return (
      <div
        className="space-y-1 font-medium text-slate-950 text-[13.5px] [&_strong]:font-bold [&_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-1 font-medium text-slate-950 text-[13.5px]">
      {lines.map((line, idx) => {
        const isBulletOrNum = /^[•\-\*]|\d+\./.test(line);
        return (
          <p key={idx} className={`leading-relaxed ${isBulletOrNum ? 'font-bold' : ''}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}
