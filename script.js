// script.js — robust CPT/unit handling + total time + PDF generation
document.addEventListener('DOMContentLoaded', () => {
  // Grab elements
  const cptItems = Array.from(document.querySelectorAll('.cpt-item'));
  const totalTimeEl = document.getElementById('totalTime');

  // Safety: if no items found, do nothing
  if (!cptItems.length) {
    console.warn('No .cpt-item elements found.');
  }

  // Attach listeners for each cpt-item (pair checkbox + select within same container)
  cptItems.forEach((item) => {
    const checkbox = item.querySelector('.cpt-checkbox');
    const select = item.querySelector('.unit-select');

    if (!checkbox || !select) return; // skip if structure different

    // initialize select disabled state to match checkbox
    select.disabled = !checkbox.checked;

    checkbox.addEventListener('change', () => {
      select.disabled = !checkbox.checked;
      // optional: reset to 1 unit when checked if previously disabled
      if (checkbox.checked && (!select.value || select.value === '0'))
        select.value = '1';
      calculateTotalTime();
    });

    select.addEventListener('change', calculateTotalTime);
  });

  // Calculates total minutes from selected CPT units (1 unit = 15 min)
  function calculateTotalTime() {
    let totalMinutes = 0;
    cptItems.forEach((item) => {
      const checkbox = item.querySelector('.cpt-checkbox');
      const select = item.querySelector('.unit-select');

      if (checkbox && checkbox.checked && select) {
        const units = parseInt(select.value) || 0;
        totalMinutes += units * 15;
      }
    });

    totalTimeEl.textContent = totalMinutes;
    return totalMinutes;
  }

  // initial calc
  calculateTotalTime();

  // PDF generation
  document.getElementById('generatePDF').addEventListener('click', () => {
    // Recalc to be safe
    const totalMinutes = calculateTotalTime();

    // Collect form values
    const name = document.getElementById('childName')?.value.trim() || 'Child';
    const date = document.getElementById('date')?.value || '';
    const subjective = document.getElementById('subjective')?.value || '';
    const objective = document.getElementById('objective')?.value || '';
    const assessment = document.getElementById('assessment')?.value || '';
    const plan = document.getElementById('plan')?.value || '';

    // Build CPT details
    const cptDetails = [];
    cptItems.forEach((item) => {
      const checkbox = item.querySelector('.cpt-checkbox');
      const select = item.querySelector('.unit-select');
      if (checkbox && checkbox.checked && select) {
        const units = parseInt(select.value) || 0;
        cptDetails.push(
          `${checkbox.value} x ${units} unit(s) (${units * 15} min)`
        );
      }
    });

    // ICD codes
    const icdChecked = Array.from(
      document.querySelectorAll('#icdCodes input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    // Use jspdf from CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    let y = 40;
    const leftMargin = 40;
    const lineHeight = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - leftMargin * 2;

    doc.setFontSize(16);
    doc.text('OT SOAP Note', leftMargin, y);
    y += 24;

    doc.setFontSize(11);
    doc.text(`Child's Name: ${name}`, leftMargin, y);
    y += lineHeight;
    doc.text(`Date: ${date}`, leftMargin, y);
    y += lineHeight;
    doc.text(`CPT: ${cptDetails.join('; ') || 'N/A'}`, leftMargin, y);
    y += lineHeight;
    doc.text(`ICD-10: ${icdChecked.join(', ') || 'N/A'}`, leftMargin, y);
    y += lineHeight;
    doc.text(`Total Treatment Time: ${totalMinutes} minutes`, leftMargin, y);
    y += lineHeight + 6;

    // utility to add multi-line sections
    function addSection(title, text) {
      doc.setFont(undefined, 'bold');
      doc.text(title + ':', leftMargin, y);
      doc.setFont(undefined, 'normal');
      y += lineHeight;
      const lines = doc.splitTextToSize(text || 'N/A', maxLineWidth);
      doc.text(lines, leftMargin, y);
      y += lines.length * (lineHeight + 2) + 8;

      // if nearing page bottom, add new page
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = 40;
      }
    }

    addSection('S — Subjective', subjective);
    addSection('O — Objective', objective);
    addSection('A — Assessment', assessment);
    addSection('P — Plan', plan);

    // signature placeholder
    y += 10;
    doc.text('Therapist Signature: ________________________', leftMargin, y);
    y += lineHeight;
    doc.save(`${name.replace(/\s+/g, '_')}_SOAP_Note.pdf`);
  });

  // Helpful debug: show console counts
  console.info(`CPT items found: ${cptItems.length}`);
});
