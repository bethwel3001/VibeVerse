import { jsPDF } from 'jspdf';

export const generatePDF = (data) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(22);
  doc.setTextColor(29, 185, 84); // Spotify green
  doc.text('Your Vibeify Report', 105, 20, { align: 'center' });
  
  // Add user info
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Name: ${data.user.displayName}`, 20, 40);
  doc.text(`Vibe: ${data.personality.vibe}`, 20, 50);
  
  // Add top artists
  doc.setFontSize(14);
  doc.text('Top Artists:', 20, 70);
  data.topArtists.items.forEach((artist, i) => {
    doc.text(`${i + 1}. ${artist.name}`, 30, 80 + (i * 10));
  });
  
  // Add roast
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`"${data.personality.roast}"`, 105, 150, { align: 'center' });
  
  doc.save('vibeify-report.pdf');
};

// Format time function if needed
export const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
};