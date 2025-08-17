import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportDashboardAsPDF(element, filename = 'vibeify.pdf') {
  if (!element) throw new Error('No element to export');
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth - 40;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
  pdf.save(filename);
}
