import jsPDF from "jspdf";
import { scoreLabel } from "@/lib/score";

const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadHabitatsCsv = (posts) => {
  const headers = ["Location", "Ecosystem", "Score", "Tier", "Latitude", "Longitude", "Summary", "Saved At"];
  const rows = posts.map((p) => [
    p.location_name,
    p.ecosystem,
    p.score,
    scoreLabel(p.score),
    p.latitude,
    p.longitude,
    p.summary,
    p.created_at,
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "biodash-habitats.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadManualPdf = () => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 64;

  const line = (txt, size, color, gap = 16, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(txt, W - M * 2);
    wrapped.forEach((w) => {
      if (y > 780) { doc.addPage(); y = 64; }
      doc.text(w, M, y);
      y += gap;
    });
  };

  // header band
  doc.setFillColor(7, 14, 11);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(16, 185, 129);
  doc.circle(M + 8, 44, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(244, 234, 225);
  doc.text("BioDash", M + 28, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153);
  doc.text("Habitat Intelligence — User Manual", M + 28, 70);
  y = 132;

  const G = [7, 14, 11];
  const E = [6, 78, 59];
  const T = [40, 40, 40];

  line("Overview", 16, E, 22, true);
  line("BioDash is a habitat-intelligence dashboard that uses AI (Gemini 3.1 Pro vision) to assess the ecological health of habitats and identify wildlife from photographs. It is a single-user tool: sign in once and start logging habitats, mapping them globally, tracking trends, and identifying animals.", 11, T, 16);
  y += 8;

  line("1. Signing In", 14, E, 20, true);
  line("Use your ranger credentials on the welcome screen. Your session is kept on this device until you sign out.", 11, T, 16);
  y += 6;

  line("2. Upload Tab — Assess a Habitat", 14, E, 20, true);
  line("• Upload or drag a habitat photo (JPEG / PNG / WEBP).", 11, T, 15);
  line("• Click 'Analyze Habitat'. The AI returns a health score from 0 to 100 plus a short summary and ecosystem label.", 11, T, 15);
  line("• Set the location: BioDash auto-reads GPS from the photo's EXIF data. If none is present, type latitude/longitude or click the mini-map.", 11, T, 15);
  line("• Click 'Save Post' to store it and drop a pin on the global map.", 11, T, 15);
  y += 6;

  line("3. Map Tab — Global View", 14, E, 20, true);
  line("• Every saved habitat appears as a color-coded pin: green = Healthy (70-100), amber = At Risk (40-69), red = Critical (0-39).", 11, T, 15);
  line("• Filter by health tier, click a pin or card to open details, and use 'Share' to export a snapshot card, or 'Delete' to remove it.", 11, T, 15);
  y += 6;

  line("4. Insights Tab — Trends", 14, E, 20, true);
  line("• See the fleet-wide average health score, tier distribution (pie chart), and per-habitat scores (bar chart).", 11, T, 15);
  line("• Download your habitat log as a CSV, or download this manual, from the action buttons.", 11, T, 15);
  y += 6;

  line("5. Animal Tab — Species & Range", 14, E, 20, true);
  line("• Upload an animal photo and click 'Identify Animal'. The AI returns the species, scientific name, IUCN conservation status, a habitat-loss summary, and key threats.", 11, T, 15);
  line("• The 'View Range' window plots the species' real-world global range on the dotted map.", 11, T, 15);
  y += 10;

  line("Scoring Guide", 14, E, 20, true);
  line("Healthy (70-100): dense biodiversity, minimal disturbance.  At Risk (40-69): fragmentation or moderate pressure.  Critical (0-39): heavy degradation and low biodiversity.", 11, T, 16);
  y += 12;

  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 18;
  line("BioDash · habitat intelligence · generated from the Insights tab", 9, [140, 140, 140], 14);

  doc.save("biodash-manual.pdf");
};
