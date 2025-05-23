import React from 'react';
import html2canvas from 'html2canvas';

const CardExporter = ({ cardRef }) => {
  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current);
    const imgData = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'vibe-card.png';
    link.click();
  };

  return (
    <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
      Export Vibe Card
    </button>
  );
};

export default CardExporter;