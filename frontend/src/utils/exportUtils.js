import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function waitForAssets(node) {
  // wait for fonts
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  // wait for images in subtree
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(res => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    });
  }));

  // small next-tick to flush layout
  await new Promise(r => setTimeout(r, 60));
}

/**
 * Temporarily disable animations/transitions to avoid clipping during capture.
 * Returns a cleanup function to restore.
 */
function disableAnimations() {
  const style = document.createElement('style');
  style.setAttribute('data-screenshot-freeze', 'true');
  style.textContent = `
    * {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
    html, body {
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(style);
  // also collapse any sticky headers overlap if needed by adding padding-top to main container (caller controls).
  return () => {
    style.parentNode && style.parentNode.removeChild(style);
  };
}

/**
 * Scroll to top to ensure full element is positioned and not virtualized out of view
 */
function scrollToTopSync() {
  const x = window.scrollX;
  const y = window.scrollY;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  return () => window.scrollTo(x, y);
}

/**
 * Export a DOM node as a high-DPI PNG (full content, not just viewport).
 * This behaves like a clean screenshot of the whole dashboard section.
 */
export async function exportElementAsPNG(node, filename = 'export.png') {
  if (!node) return;

  const restoreScroll = scrollToTopSync();
  const restoreAnim = disableAnimations();

  try {
    await waitForAssets(node);

    // ensure the node has full width for capture (no overflow clipping)
    const prevWidth = node.style.width;
    node.style.width = getComputedStyle(node).width;

    // high scale for crisp output; set background to match page
    const canvas = await html2canvas(node, {
      scale: window.devicePixelRatio > 1 ? 2 : 2, // stable 2x for consistent quality
      useCORS: true,
      logging: false,
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#000000',
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      removeContainer: true
    });

    node.style.width = prevWidth || '';

    const dataURL = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('Failed to export PNG. See console for details.');
  } finally {
    restoreAnim();
    restoreScroll();
  }
}

/**
 * Export a DOM node as a PDF (handles long pages with multipage slicing).
 * Portrait A4 by default.
 */
export async function exportElementAsPDF(node, filename = 'export.pdf') {
  if (!node) return;

  const restoreScroll = scrollToTopSync();
  const restoreAnim = disableAnimations();

  try {
    await waitForAssets(node);

    // Render canvas at 2x for crisp text
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#000000',
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // PDF page size (A4) in pts: 595.28 x 841.89; we’ll work in px then scale.
    const pdf = new jsPDF('p', 'pt', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale image to fit width; compute height ratio
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * (imgWidth / canvas.width);

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Additional pages
    while (heightLeft > 0) {
      pdf.addPage();
      position = - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('Failed to export PDF. See console for details.');
  } finally {
    restoreAnim();
    restoreScroll();
  }
}
