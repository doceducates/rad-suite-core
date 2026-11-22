// Layer 2 (Domain/Services): High-fidelity Isolated Hospital Stationery Printing
// Guarantees zero background page leakage, exact A4 pagination, and full rendering of logos and patient demographics

/**
 * Prints the hospital report stationery in an isolated iframe sandbox.
 * Converts input fields into clean static typography, resolves all image URLs,
 * and ensures header logos and patient profile tables are 100% visible.
 */
export function printReportSheet(elementId = 'lgh-report-sheet'): boolean {
  if (typeof window === 'undefined') return false;

  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    window.print();
    return false;
  }

  // 1. Deep clone the stationery element so we can sanitize inputs and resolve images
  const clone = sourceElement.cloneNode(true) as HTMLElement;

  // Sync live input values (doctor name, designation) and replace inputs with clean static spans
  const originalInputs = sourceElement.querySelectorAll('input');
  const clonedInputs = clone.querySelectorAll('input');
  originalInputs.forEach((orig, idx) => {
    const cloned = clonedInputs[idx];
    if (cloned) {
      const span = document.createElement('span');
      span.className = cloned.className;
      span.textContent = orig.value || cloned.getAttribute('placeholder') || '';
      cloned.parentNode?.replaceChild(span, cloned);
    }
  });

  // Ensure all image URLs are fully qualified absolute URLs
  const originalImages = sourceElement.querySelectorAll('img');
  const clonedImages = clone.querySelectorAll('img');
  originalImages.forEach((img, idx) => {
    if (clonedImages[idx] && img.src) {
      clonedImages[idx].src = img.src;
    }
  });

  // 2. Create a hidden, isolated iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  );
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    window.print();
    return false;
  }

  // 3. Clone stylesheets and Tailwind runtime CSS from parent document
  const headElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  // 4. Construct clean standalone print document containing ONLY the stationery
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}/" />
        <title>Hospital Clinical Report Sheet</title>
        ${headElements}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-stationery {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          /* Ensure header, patient demographics table, and images are strictly visible */
          .a4-stationery header {
            display: flex !important;
            visibility: visible !important;
          }
          .a4-stationery table {
            display: table !important;
            visibility: visible !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .a4-stationery tr {
            display: table-row !important;
          }
          .a4-stationery td,
          .a4-stationery th {
            display: table-cell !important;
          }
          .a4-stationery img {
            display: block !important;
            visibility: visible !important;
            max-height: 80px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // 5. Trigger print once images are loaded
  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  };

  const images = Array.from(iframeDoc.images);
  if (images.length === 0) {
    setTimeout(executePrint, 150);
  } else {
    const promises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    Promise.all(promises).then(() => {
      setTimeout(executePrint, 150);
    });
  }

  return true;
}
