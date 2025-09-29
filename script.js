// script.js — SOAP generator with CPT parsing & print (works offline)

/* -------------------------
   Helpers: parse CPT entries
   Accepts lines like:
     97530 x 2
     97535 x 1 unit
     97530, units:2
     97530 x 2 units (30 min)
   If units not provided and minutes present in parentheses, it will compute units = minutes / 15.
   Returns array of objects: {code, units, minutes, raw}
--------------------------*/
function parseCPT(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries = [];

  for (let raw of lines) {
    // Try patterns
    // Pattern 1: code x number
    let m = raw.match(/(\d{5})\s*[x×]\s*(\d+)/i);
    if (m) {
      const code = m[1];
      const units = parseInt(m[2], 10);
      entries.push({ code, units, minutes: units * 15, raw });
      continue;
    }

    // Pattern 2: code, units:2
    m = raw.match(/(\d{5}).*units?\s*[:=]?\s*(\d+)/i);
    if (m) {
      const code = m[1];
      const units = parseInt(m[2], 10);
      entries.push({ code, units, minutes: units * 15, raw });
      continue;
    }

    // Pattern 3: code and minutes like (30 min)
    m = raw.match(/(\d{5}).*\(?\s*(\d{1,3})\s*min\s*\)?/i);
    if (m) {
      const code = m[1];
      const minutes = parseInt(m[2], 10);
      const units = Math.ceil(minutes / 15);
      entries.push({ code, units, minutes: units * 15, raw });
      continue;
    }

    // Pattern 4: code only (assume 1 unit)
    m = raw.match(/(\d{5})/);
    if (m) {
      const code = m[1];
      const units = 1;
      entries.push({ code, units, minutes: 15, raw });
      continue;
    }

    // If nothing matched, keep raw as note
    entries.push({ code: raw, units: 0, minutes: 0, raw });
  }

  return entries;
}

/* -------------------------
   Build the SOAP note text
--------------------------*/
function buildNote(fields) {
  const {
    childName, date, therapist, duration,
    icd, cptRaw, S, O, A, P
  } = fields;

  const cptEntries = parseCPT(cptRaw);
  let totalMinutes = cptEntries.reduce((s,e)=> s + (e.minutes || 0), 0);
  // If totalMinutes is 0, fallback to provided duration
  if (totalMinutes === 0 && duration) totalMinutes = Number(duration);

  const totalUnits = Math.ceil(totalMinutes / 15);

  // Create CPT summary lines
  const cptSummaryLines = cptEntries.map(e=>{
    if (e.units > 0) return `${e.code} x ${e.units} unit(s) (${e.minutes} min)`;
    return `${e.raw} (unparsed)`;
  });

  const icdPretty = icd.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).join(', ');

  // Note template
  const note =
`Pediatric Occupational Therapy SOAP Note
Child: ${childName || '________________'}
Date: ${date || '____/__/__'}
Therapist: ${therapist || '________________'}
Session Duration (documented): ${duration || '_____'} min

ICD-10 Codes:
${icdPretty || '________________'}

CPT Codes (calculated):
${cptSummaryLines.length ? cptSummaryLines.join('\n') : '________________'}
Total billed time (calculated): ${totalMinutes} min (${totalUnits} unit(s) x 15 min)

S — Subjective:
${S || '________________'}

O — Objective:
${O || '________________'}

A — Assessment:
${A || '________________'}

P — Plan:
${P || '________________'}

Therapist Signature: _________________________      Date: ${date || '____/__/__'}`;

  return { note, cptEntries, totalMinutes, totalUnits, icdPretty };
}

/* -------------------------
   DOM & Event wiring
--------------------------*/
document.addEventListener('DOMContentLoaded', () => {
  const els = {
    childName: document.getElementById('childName'),
    date: document.getElementById('date'),
    therapist: document.getElementById('therapist'),
    duration: document.getElementById('duration'),
    icd: document.getElementById('icd'),
    cpt: document.getElementById('cpt'),
    subjective: document.getElementById('subjective'),
    objective: document.getElementById('objective'),
    assessment: document.getElementById('assessment'),
    plan: document.getElementById('plan'),
    output: document.getElementById('output'),
    summary: document.getElementById('summary'),
    generateBtn: document.getElementById('generateBtn'),
    printBtn: document.getElementById('printBtn'),
    clearBtn: document.getElementById('clearBtn')
  };

  function gatherFields(){
    return {
      childName: els.childName.value.trim(),
      date: els.date.value,
      therapist: els.therapist.value.trim(),
      duration: els.duration.value,
      icd: els.icd.value.trim(),
      cptRaw: els.cpt.value.trim(),
      S: els.subjective.value.trim(),
      O: els.objective.value.trim(),
      A: els.assessment.value.trim(),
      P: els.plan.value.trim()
    };
  }

  els.generateBtn.addEventListener('click', () => {
    const fields = gatherFields();
    const { note, cptEntries, totalMinutes, totalUnits, icdPretty } = buildNote(fields);

    // Show summary
    const codesCount = cptEntries.length;
    const parsedCount = cptEntries.filter(e => e.units>0 || e.minutes>0).length;
    els.summary.innerText = `CPT entries: ${codesCount} (parsed: ${parsedCount}). Calculated total: ${totalMinutes} min — ${totalUnits} unit(s).`;

    els.output.textContent = note;

    // Update the Session Duration field to match calculation (optional)
    if (totalMinutes && (!fields.duration || fields.duration == 0)) {
      els.duration.value = totalMinutes;
    }
  });

  // Print/Download button uses window.print() -> user chooses "Save as PDF"
  els.printBtn.addEventListener('click', () => {
    // If output empty, generate automatically
    if (!els.output.textContent.trim()) {
      els.generateBtn.click();
    }
    // Briefly show a small print-friendly style (the browser handles PDF)
    window.print();
  });

  // Clear form
  els.clearBtn.addEventListener('click', () => {
    if (!confirm('Clear the form? This will remove all entries in the form fields.')) return;
    els.childName.value = '';
    els.date.value = '';
    els.therapist.value = '';
    els.duration.value = 45;
    els.icd.value = '';
    els.cpt.value = '';
    els.subjective.value = '';
    els.objective.value = '';
    els.assessment.value = '';
    els.plan.value = '';
    els.output.textContent = '';
    els.summary.innerText = '';
  });
});
