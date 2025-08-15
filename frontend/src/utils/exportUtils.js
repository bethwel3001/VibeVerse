import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportDashboardAsPDF(element, filename = 'vibeify.pdf') {
  if (!element) throw new Error('No element to export');

  // Render the element to canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Calculate width and height for PDF page
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // scale image to fit width
  const imgWidth = pageWidth - 40; // margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
  pdf.save(filename);
}
