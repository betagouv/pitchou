/**
 * Builds a tiny, valid one-page PDF whose only content is the given title.
 * Used by seeds to produce downloadable placeholder files (pièces jointes,
 * fichier de l'arrêté…) without shipping real binaries.
 */
export function generatePlaceholderPdf(titre: string): Buffer {
  const texte = `Piece jointe de seed : ${titre}`
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/[()]/g, "\\$&");

  const flux = `BT /F1 16 Tf 60 780 Td (${texte}) Tj ET`;
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  const header = "%PDF-1.4\n";
  let corps = "";
  const offsets = objets.map((obj, i) => {
    const offset = header.length + corps.length;
    corps += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    return offset;
  });

  const startxref = header.length + corps.length;
  const taille = objets.length + 1;
  let xref = `xref\n0 ${taille}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${taille} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  // latin1: 1 byte/char, so string.length === byteLength (exact offsets).
  return Buffer.from(header + corps + xref + trailer, "latin1");
}
