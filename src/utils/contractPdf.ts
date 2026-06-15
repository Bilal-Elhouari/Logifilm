import jsPDF from "jspdf";
import { CrewMember } from "../services/api";

const PAGE_W = 612;
const TABLE_X = 23;
const TABLE_Y = 74;
const TABLE_W = 566;
const BLACK = "#000000";
const LIGHT = "#f1f3f5";
const MID = "#c7c7c7";

type Paragraph = {
  n: string;
  title: string;
  body: string;
};

type ClausePair = {
  en: Paragraph;
  fr: Paragraph;
};

function raw(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function upper(value: string | number | null | undefined) {
  return raw(value).toUpperCase();
}

function fullName(member: CrewMember) {
  return `${member.first_name || ""} ${member.last_name || ""}`.trim().toUpperCase();
}

function formatDate(value: string | null | undefined) {
  const source = raw(value).trim();
  if (!source) return "";
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return source.replaceAll("-", "/");
}

function money(value: string | number | null | undefined) {
  const source = raw(value).trim();
  if (!source) return "";
  return source.replace(/MAD/i, "").trim();
}

function setLine(pdf: jsPDF, width = 1.2) {
  pdf.setDrawColor(BLACK);
  pdf.setLineWidth(width);
}

function line(pdf: jsPDF, x1: number, y1: number, x2: number, y2: number, width = 1.2) {
  setLine(pdf, width);
  pdf.line(x1, y1, x2, y2);
}

function rect(pdf: jsPDF, x: number, y: number, w: number, h: number, style: "S" | "F" | "FD" = "S", fill?: string) {
  if (fill) pdf.setFillColor(fill);
  setLine(pdf);
  pdf.rect(x, y, w, h, style);
}

function label(pdf: jsPDF, x: number, y: number, normal: string, italic?: string, size = 7) {
  pdf.setTextColor(BLACK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  pdf.text(normal, x, y);
  if (italic) {
    const dx = pdf.getTextWidth(normal) + 1.5;
    pdf.setFont("helvetica", "italic");
    pdf.text(italic, x + dx, y);
  }
}

function value(pdf: jsPDF, text: string | number | null | undefined, x: number, y: number, opts: { size?: number; align?: "left" | "center" | "right"; maxWidth?: number } = {}) {
  pdf.setTextColor(BLACK);
  pdf.setFont("courier", "bold");
  pdf.setFontSize(opts.size || 11);
  pdf.text(upper(text), x, y, {
    align: opts.align || "left",
    maxWidth: opts.maxWidth,
  });
}

function fittedValue(
  pdf: jsPDF,
  text: string | number | null | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxSize = 9.6,
  minSize = 5
) {
  const content = upper(text);
  let size = maxSize;

  pdf.setFont("courier", "bold");
  pdf.setFontSize(size);
  while (content && pdf.getTextWidth(content) > maxWidth && size > minSize) {
    size -= 0.25;
    pdf.setFontSize(size);
  }

  pdf.text(content, x, y);
}

function fittedCenteredValue(
  pdf: jsPDF,
  text: string | number | null | undefined,
  x: number,
  y: number,
  w: number,
  maxSize = 10,
  minSize = 5
) {
  const content = upper(text);
  let size = maxSize;

  pdf.setFont("courier", "bold");
  pdf.setFontSize(size);
  while (content && pdf.getTextWidth(content) > w - 8 && size > minSize) {
    size -= 0.25;
    pdf.setFontSize(size);
  }

  pdf.text(content, x + w / 2, y, { align: "center" });
}

function fillValueBand(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  pdf.setFillColor(LIGHT);
  pdf.rect(x + 3, y + h - 19, w - 6, 17, "F");
}

function paragraph(pdf: jsPDF, p: Paragraph, x: number, y: number, w: number, size = 7.15, leading = 9.8) {
  pdf.setTextColor(BLACK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);

  const prefix = `${p.n}. `;
  pdf.text(prefix, x, y);
  const prefixW = pdf.getTextWidth(prefix);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${p.title}:`, x + prefixW, y);

  pdf.setFont("helvetica", "normal");
  const startX = x + prefixW + pdf.getTextWidth(`${p.title}: `);
  const firstWidth = w - (startX - x);
  const words = p.body.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  let available = firstWidth;

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (pdf.getTextWidth(next) > available && current) {
      lines.push(current);
      current = word;
      available = w;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);

  if (lines[0]) {
    pdf.text(lines[0], startX, y, {
      align: lines.length > 1 ? "justify" : "left",
      maxWidth: firstWidth,
    });
  }
  for (let i = 1; i < lines.length; i += 1) {
    pdf.text(lines[i], x, y + i * leading, {
      align: i < lines.length - 1 ? "justify" : "left",
      maxWidth: w,
    });
  }

  return y + Math.max(lines.length, 1) * leading;
}

function clausePair(pdf: jsPDF, pair: ClausePair, y: number, options: { size?: number; leading?: number; gap?: number; leftX?: number; rightX?: number; width?: number } = {}) {
  const leftX = options.leftX || 40;
  const rightX = options.rightX || 314;
  const width = options.width || 255;
  const size = options.size || 7.15;
  const leading = options.leading || 9.8;
  const leftBottom = paragraph(pdf, pair.en, leftX, y, width, size, leading);
  const rightBottom = paragraph(pdf, pair.fr, rightX, y, width, size, leading);
  return Math.max(leftBottom, rightBottom) + (options.gap ?? 14);
}

function drawHeader(pdf: jsPDF) {
  pdf.setTextColor(BLACK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text('Zak Productions S.A.R.L. ("Producer")', PAGE_W / 2, 31, { align: "center" });
  pdf.setFontSize(10.4);
  pdf.text("Avenue Mohamed V, Résidence Badr, Apartments 17-18, Marrakech 40020, Morocco", PAGE_W / 2, 47, { align: "center" });

  pdf.setFontSize(12);
  const titleA = "CREW DEAL MEMO ";
  const titleB = "(CONTRAT D’ENGAGEMENT A DURÉE DETERMINÉE)";
  const wA = pdf.getTextWidth(titleA);
  const wB = pdf.getTextWidth(titleB);
  const x = PAGE_W / 2 - (wA + wB) / 2;
  pdf.setFont("helvetica", "bold");
  pdf.text(titleA, x, 63);
  pdf.setFont("helvetica", "bolditalic");
  pdf.text(titleB, x + wA, 63);
}

function drawTableGrid(pdf: jsPDF) {
  const x = TABLE_X;
  const y = TABLE_Y;
  const w = TABLE_W;

  rect(pdf, x, y, w, 340);

  [102, 132, 162, 196, 250, 270, 310, 331, 384].forEach((yy) => line(pdf, x, yy, x + w, yy));
  line(pdf, x, 291, 318, 291);

  line(pdf, 354, 74, 354, 132);
  line(pdf, 249, 102, 249, 162);
  line(pdf, 354, 102, 354, 132);
  line(pdf, 212, 162, 212, 196);
  line(pdf, 400, 162, 400, 196);

  line(pdf, 318, 196, 318, 384);
  line(pdf, 408, 196, 408, 384);
  line(pdf, 488, 196, 488, 384);

  line(pdf, 170, 224, 170, 250);
  line(pdf, 248, 224, 248, 250);
  line(pdf, 170, 224, 318, 224);

  line(pdf, 163, 250, 163, 270);
  line(pdf, 163, 291, 163, 331);

  line(pdf, 408, 351, 589, 351);
  line(pdf, 408, 368, 589, 368);
  line(pdf, 354, 384, 354, 414);

  rect(pdf, 318, 196, 270, 28, "F", BLACK);
  rect(pdf, 318, 368, 90, 16, "F", MID);
  rect(pdf, 408, 368, 80, 16, "F", MID);
  rect(pdf, 488, 368, 101, 16, "F", MID);

  // Redraw the gray-band borders after filling it so every separation remains visible.
  line(pdf, 318, 368, 589, 368);
  line(pdf, 318, 384, 589, 384);
  line(pdf, 318, 368, 318, 384);
  line(pdf, 408, 368, 408, 384);
  line(pdf, 488, 368, 488, 384);
  line(pdf, 589, 368, 589, 384);
}

function drawTableText(pdf: jsPDF, member: CrewMember) {
  const start = formatDate(member.start_date);
  const end = formatDate(member.end_date);
  const name = fullName(member);
  const project = member.project_title || "";
  const rateDay = money(member.daily_rate);
  const rateWeek = money(member.rate);
  const seventh = money(member.day_worked);

  label(pdf, 29, 83, "PROGRAM TITLE ", "(Nom du Programme)");
  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(10);
  pdf.text(`“${project}”`, 160, 86, { maxWidth: 150 });
  label(pdf, 360, 83, "START DATE ", "(Date de Début)", 9);
  value(pdf, `${start}   AU  '${end}`, 360, 97, { size: 11 });

  label(pdf, 29, 112, "NAME OF HIREE ", "(Nom du Prestataire)", 9);
  value(pdf, name, 30, 126, { size: 11 });
  label(pdf, 255, 112, "ICE #", undefined, 9);
  fittedValue(pdf, member.ice, 255, 126, 93);
  label(pdf, 360, 112, "POSITION ", "(Fonction)", 9);
  fittedValue(pdf, member.position, 360, 128, 218);

  label(pdf, 29, 144, "DURATION OF WORK CONTRACT: ", "(Durée du Contrat)", 7.5);
  fittedValue(pdf, `${start} - ${end}`, 29, 158, 210, 8.5, 5);
  label(pdf, 255, 144, "CCM PROFESSIONAL CARD", undefined, 7.5);
  fittedValue(pdf, member.patent_number, 255, 158, 320, 8.5, 5);

  label(pdf, 29, 173, "PROFESSIONAL TAX ", "", 9);
  fillValueBand(pdf, 26, 162, 184, 34);
  label(pdf, 218, 173, "TAX IDENTIFICATION ", "(Identifiant Fiscal)", 9);
  fillValueBand(pdf, 215, 162, 183, 34);
  value(pdf, member.if_number, 218, 191, { size: 11 });
  label(pdf, 406, 173, "CIN/PASSPORT", undefined, 9);
  fillValueBand(pdf, 403, 162, 184, 34);
  value(pdf, member.id_card_number, 407, 191, { size: 11 });

  label(pdf, 29, 207, "ADDRESS ", "(addresse)", 9);
  pdf.setFillColor(LIGHT);
  pdf.rect(29, 211, 282, 12, "F");
  fittedValue(pdf, member.address, 29, 222, 278, 10.5, 5);

  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("TERMS OF", 363, 207, { align: "center" });
  pdf.text("HIRE", 363, 217, { align: "center" });
  pdf.text("LOCAL or NEARBY", 448, 206, { align: "center" });
  pdf.text("LOCATION", 448, 217, { align: "center" });
  pdf.text("DISTANT", 538, 206, { align: "center" });
  pdf.text("LOCATION", 538, 217, { align: "center" });
  pdf.setTextColor(BLACK);

  label(pdf, 174, 234, "CITY ", "(Ville)", 7.5);
  pdf.setFillColor(LIGHT);
  pdf.rect(174, 237, 68, 11, "F");
  fittedValue(pdf, member.city, 174, 247, 68, 8.5, 5);
  label(pdf, 253, 234, "ZIP ", "(Code Postal)", 7.5);
  fittedValue(pdf, member.zip_code, 253, 247, 58, 8.5, 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("RATE PER DAY", 363, 234, { align: "center" });
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  pdf.text("(Cachet par jour)", 363, 244, { align: "center" });
  fittedCenteredValue(pdf, rateDay, 488, 243, 100, 10.5);

  label(pdf, 29, 257, "HOME PHONE ", "(Téléphone Domicile)", 6.2);
  fittedValue(pdf, member.phone, 29, 267, 128, 8.5, 5);
  label(pdf, 168, 257, "CELL PHONE ", "(Téléphone Portable)", 6.2);
  fittedValue(pdf, member.mobile, 168, 267, 142, 8.5, 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("RATE PER WEEK", 363, 258, { align: "center" });
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  pdf.text("(Cachet par semaine)", 363, 267, { align: "center" });
  fittedCenteredValue(pdf, rateWeek, 488, 265, 100, 10.5);

  label(pdf, 29, 282, "EMAIL", undefined, 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.text("PAYMENT TERMS", 363, 280, { align: "center" });
  pdf.text("FREQUENCY AND DELAYS", 363, 288, { align: "center" });
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(6.8);
  pdf.text("(Conditions de paiement)", 363, 298, { align: "center" });

  label(pdf, 29, 302, "BOX RENTAL", undefined, 7);
  label(pdf, 168, 302, "CAR ALLOWANCE", undefined, 7);
  label(pdf, 29, 321, "BOX CAP", undefined, 7);
  label(pdf, 168, 321, "CELL PHONE ALLOWANCE", undefined, 7);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text("7", 350, 318);
  pdf.setFontSize(5);
  pdf.text("th", 355, 314);
  pdf.setFontSize(7.5);
  pdf.text("DAY", 363, 318);
  pdf.text("RATE", 363, 327, { align: "center" });
  fittedCenteredValue(pdf, seventh, 488, 326, 100, 10.5);

  label(pdf, 29, 343, "EMERGENCY CONTACT (NAME AND PHONE)", undefined, 9);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(6.5);
  pdf.text("(Nom et téléphone de la personne à contacter en cas d’urgence)", 29, 355);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("PER DIEM", 363, 342, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text("Shoot day:", 412, 343);
  pdf.text("Shoot day:", 492, 343);
  pdf.text("Non Shoot day:", 412, 364);
  pdf.text("Non Shoot day:", 492, 364);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(5.5);
  pdf.text("Production Office to", 363, 375, { align: "center" });
  pdf.text("verify and initial:", 363, 382, { align: "center" });
  pdf.text("CSATF Roster Check", 448, 379, { align: "center" });
  pdf.text("CSATF Safety Training", 538, 379, { align: "center" });

  label(pdf, 29, 396, "NOTES", undefined, 7);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.2);
  pdf.text("PAYMENTS WILL BE MADE IN ACCORDANCE WITH THE AMOUNTS", 188.5, 401, { align: "center" });
  pdf.text("REFLECTED IN THE APPROVED INVOICES.", 188.5, 411, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.2);
  pdf.text("SCREEN CREDIT (if granted, at Producer’s sole discretion) NAME TO", 360, 394);
  pdf.text("READ:", 360, 403);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(6.2);
  pdf.text("(Nom à mentionner au générique en cas l’accord du Producteur)", 360, 412);
}

const page1Pairs: ClausePair[] = [
  {
    en: {
      n: "1",
      title: "TERM",
      body: "In accordance with the provisions of section 6 of Law n° 68-16, this deal memo is concluded for a limited time for the abovementioned duration. The expiration or termination of this deal memo shall not affect the ownership by Producer of the rights granted herein\nIt is however expressly agreed that this deal memo may be terminated by Producer (in its sole discretion) without cause by a 7 days’ notice to Artist.",
    },
    fr: {
      n: "1",
      title: "DUREE",
      body: "Conformément aux dispositions de l'article 6 de la loi n° 68-16, ce contrat d’engagement est conclu pour la durée déterminée ci-dessus. L'expiration ou la résiliation de ce contrat d’engagement n'affectera pas la détention du Producteur sur les droits accordés en vertu des présentes.\nIl est cependant expressément convenu que ce contrat engagement peut être résilié par le Producteur (à son entière discrétion) sans motif moyennant préavis de 7 jours à l'Artiste.",
    },
  },
  {
    en: { n: "2", title: "OVERTIME", body: "No overtime will be paid unless authorized IN ADVANCE by the Line Producer or Unit Production Manager." },
    fr: { n: "2", title: "HEURES SUPPLEMENTAIRES", body: "Aucune heure supplémentaire ne sera payée à moins d'être autorisée A L'AVANCE par le Producteur Délégué ou par le Directeur de Production." },
  },
  {
    en: { n: "3", title: "INVOICING", body: "Hiree shall deliver to the Producer a bona fide invoice for the services rendered in connection with this deal memo which shall contain all the mentions required by applicable law and regulations." },
    fr: { n: "3", title: "FACTURATION", body: "Le Prestataire sera tenu de délivrer au Producteur une facture relative aux prestations effectuées dans le cadre des présentes en bonne et due forme et contenant les mentions requises par la législation en vigueur." },
  },
  {
    en: { n: "4", title: "DEDUCTIONS", body: "Hiree hereby expressly authorizes the company to deduct any outstanding balance in Hiree’s petty cash advance fund or any unsettled hotel incidentals incurred by Hiree from Hiree’s final paycheck if not cleared prior to termination. Hiree shall sign a receipt of payment detailing the pay deductions applied." },
    fr: { n: "4", title: "DEDUCTIONS", body: "Le Prestataire autorise expressément le Producteur à déduire de son dernier paiement toute avance consentie au Prestataire ou tout extra d'hôtel consommé par le Prestataire et non réglés et/ou remboursés à l’échéance du contrat. L'employé devra signer un solde de tout compte détaillant les déductions appliquées." },
  },
  {
    en: { n: "5", title: "DAMAGES", body: "Hiree’s sole remedy for Producer’s breach or termination of this agreement shall be an action for money damages pursuant to section 12 of Law n° 68-16. Hiree irrevocably waives any right to enjoin the production, distribution, exhibition, exploitation or advertisement of the Program." },
    fr: { n: "5", title: "DOMMAGES", body: "En cas de violation ou de rupture abusive de ce contrat par le Producteur, le recours du Prestataire se limitera à une action en dommage-intérêts dans le cadre des dispositions de l’article 12 de la loi n° 68-16. Le Prestataire renonce irrévocablement à toute action visant à empêcher la production, la distribution, l'exposition, l'exploitation ou la publicité du Programme." },
  },
];

const page2Pairs: ClausePair[] = [
  {
    en: { n: "6", title: "PURCHASE ORDERS", body: "Any purchases or rentals initiated by Hiree on behalf of the production must be authorized by a purchase order approved in advance by the Line Producer or Unit Production Manager." },
    fr: { n: "6", title: "ACHATS", body: "Tout achat ou location initiée par le Prestataire pour le compte de la production devra être autorisé par un bon de commande approuvé par avance par le Producteur Délégué ou par le Directeur de Production." },
  },
  {
    en: { n: "7", title: "PETTY CASH", body: "All Petty Cash expenditures must be documented by valid original receipts and be submitted for reimbursement within 30 days of expenditure. Petty Cash expenditures should not exceed a total amount of MAD 5.000,00. Petty Cash expenditures over MAD 1.000,00 shall be approved in advance by the Line Producer or UPM." },
    fr: { n: "7", title: "CAISSE", body: "Toutes les dépenses de caisse doivent être documentées par des reçus originaux valides et être soumises au remboursement dans les 30 jours de la dépense. Les petites dépenses en espèces ne doivent pas dépasser un total de MAD 5.000,00. Toute dépense de caisse supérieure à MAD 1.000,00 devra être préalablement approuvée par le Producteur Délégué ou par le Directeur de Production." },
  },
  {
    en: { n: "8", title: "RECOVERABLE ASSETS", body: "Hiree is responsible for all recoverable assets purchased or promoted on the production. Such items must be safeguarded, inventoried, and reconciled with accounting at wrap. No asset may be sold, traded or given away without written Studio approval." },
    fr: { n: "8", title: "ACTIFS RÉCUPÉRABLES", body: "L'employé est responsable de tous les actifs récupérables acquis ou promus sur la production. Ces articles doivent être sauvegardés, inventoriés et conciliés avec la comptabilité à la conclusion. Aucun actif ne peut être vendu, échangé ou donné sans l’approbation écrite du studio." },
  },
  {
    en: { n: "9", title: "PRODUCT PLACEMENT", body: "No production tie-ins or product placement or any promotional activity are to be made without written permissions from Producer." },
    fr: { n: "9", title: "PLACEMENT DE PRODUIT", body: "Aucun produit dérivé ou placement de produit ou autre activité promotionnelle ne doit être effectué sans autorisation écrite du Producteur." },
  },
  {
    en: { n: "10", title: "TRANSPORTATION", body: "Transportation to and from a distant location will be provided by Producer. Hiree is not to drive to distant location unless authorized. Any unauthorized travel to distant location is at Hiree’s risk and liability." },
    fr: { n: "10", title: "TRANSPORT", body: "Le transport vers et depuis un site éloigné sera assuré par le Producteur. Le Prestataire ne doit pas se rendre à un site éloigné par ses propres moyens sauf autorisation. Tout voyage non autorisé à un site éloigné se fera au risque et sous la responsabilité du Prestataire." },
  },
  {
    en: { n: "11", title: "RIGHTS", body: "Hiree hereby irrevocably grants Producer, and Producer shall own as a work made for hire, all rights in and to the results and proceeds of Hiree's services in and in connection with the Program, in all media now known or hereafter devised throughout the universe in perpetuity.\nSimilarly, Hiree irrevocably and unconditionally waives in perpetuity, in connection with the Program, the benefits of any provision of law known as moral rights or \"droit moral\" or any similar rights whether now existing or hereafter conferred under the laws of any jurisdiction. As a separate undertaking, Hiree agrees not to take any legal action in any jurisdiction on the ground that the Program (or any version of the Program) or the use of the Program in any way constitutes an infringement of any such rights." },
    fr: { n: "11", title: "DROITS", body: "Par les présentes, le Prestataire accorde irrévocablement au Producteur, et le Producteur en sera propriétaire, en tant que travail sur commande, tous les droits sur les résultats et les produits résultant des services du Prestataire dans et en relation avec le Programme, dans tous supports et moyens connus ou à venir dans tout l’univers et à perpétuité.\nDe même, le Prestataire renonce irrévocablement et inconditionnellement à perpétuité, dans le cadre du Programme, au bénéfice de toute disposition légale connue sous le nom de \"droit moral\" ou de droits similaires, que ces droits existent ou qu’ils soient conférés ultérieurement, en vertu des lois de toute juridiction. En tant qu'engagement distinct, le Prestataire accepte de ne pas engager de poursuites judiciaires dans une quelconque juridiction au motif que le Programme (ou toute version du Programme) ou son utilisation constitue une atteinte quelconque à ces droits." },
  },
  {
    en: { n: "12", title: "PUBLICITY", body: "Hiree agrees not to give any interviews or authorize any publicity relating to Hiree's services, the Program or Producer without Producer’s express prior written permission. Hiree hereby grants Producer the right to use Hiree’s name, likeness, and voice in publicity related photographs, \"behind the scenes\" films and books, and \"electronic press kit\" video releases, or in all media now known or hereafter devised throughout the universe in perpetuity in connection with any other exploitation of the Program. Producer may require services in connection with the creation of promotional material for the production and such services shall be treated and compensated in the same way and at the same rates as regular production services." },
    fr: { n: "12", title: "PUBLICITÉ", body: "Le Prestataire s'engage à ne pas donner d'interviews ni à autoriser une quelconque publicité en rapport avec les services du Prestataire, le Programme ou le Producteur sans l'autorisation écrite expresse et préalable du Producteur. Le Prestataire accorde, par les présentes, au producteur le droit d'utiliser le nom, la ressemblance et la voix du Prestataire dans des photographies publicitaires, des films et des livres sur les coulisses et des communiqués vidéo de dossier de presse électronique ou dans tout média connu ou à venir dans l’univers entier et à perpétuité dans le cadre de toute autre exploitation du Programme. Tout service du Prestataire dans le cadre de la création de matériel promotionnel pour la production sera traitée et compensée comme une prestation normale." },
  },
  {
    en: { n: "13", title: "CONTROLLED SUBSTANCES", body: "Hiree acknowledges that Producer will not tolerate the use of alcohol or controlled substances on the job or at any time at the work place." },
    fr: { n: "13", title: "SUBSTANCES CONTRÔLÉES", body: "Le Prestataire est avisé que le Producteur ne tolérera pas la consommation d'alcool ou de substances contrôlées pendant le travail ou à tout moment sur le lieu de travail." },
  },
  {
    en: { n: "14", title: "PERSONAL LOSSES", body: "Hiree is advised and hereby acknowledges that Producer facilities or production locations cannot be secure and that Producer is not responsible for the theft, loss and/or damage of Hiree's personal property or box rental items." },
    fr: { n: "14", title: "PERTES PERSONNELLES", body: "Le Prestataire est informé et reconnaît que les locaux du Producteur ou les sites de production ne peuvent pas être sécurisés et que le Producteur ne pourra être pour responsable du vol, de la perte et/ou de l’endommagement des effets personnels du Prestataire ou des articles consignés." },
  },
  {
    en: { n: "15", title: "HIREE RENTALS", body: "Any rentals from Hiree must be documented with a rental agreement and detailed inventory at the time of hire. Rentals will be pro-rated for partial weeks and not be paid on days not worked, including idle days, travel days, and holidays." },
    fr: { n: "15", title: "LOCATIONS", body: "Toute location du Prestataire doit être documentée par un contrat de location avec un inventaire détaillé établi au moment de l’engagement. Les locations seront calculées au prorata pour les semaines partielles et ne seront pas payées les jours non travaillés, y compris les jours d'inactivité, les jours de voyage et les jours fériés." },
  },
  {
    en: { n: "16", title: "MOBILE PHONES", body: "Only individuals designated by the Line Producer or UPM in advance in writing can be reimbursed for mobile phone usage. No rental or access charges will be paid." },
    fr: { n: "16", title: "TÉLÉPHONES MOBILES", body: "Seuls les individus désignés par avance et par écrit de la part du Producteur Délégué ou de la part du Directeur de Production peuvent être remboursés pour l'utilisation du téléphone mobile. Aucun frais de location ou d'accès ne sera payé." },
  },
];

const page3Pairs: ClausePair[] = [
  {
    en: { n: "17", title: "SHIPPING", body: "Hiree understands that Producer requires that all materials and equipment destined for use on the Program must be shipped through the Production office. Hiree agrees to adhere to this policy, and understands that failure to do so could result in disciplinary action." },
    fr: { n: "17", title: "EXPÉDITION", body: "Le Prestataire comprend que le Producteur exige que tous le matériel et équipements destinés à être utilisés dans le cadre du Programme doivent être expédiés à travers le bureau de production. L'employé s'engage à appliquer cette politique et comprend que l'omission de le faire pourrait entraîner des sanctions." },
  },
  {
    en: { n: "18", title: "PAID LEAVE", body: "Hiree shall be entitled to paid leave and rest days as provided for by the relevant regulations." },
    fr: { n: "18", title: "JOURS DE REPOS", body: "Le Prestataire a droit aux jours de repos prévus par la législation en vigueur." },
  },
  {
    en: { n: "19", title: "COMPLIANCE WITH THE FOREIGN CORRUPT PRACTICES ACT", body: "It is the policy of Producer to comply fully with the U.S. Foreign Corrupt Practices Act, 15 U.S.C. Section 78dd-1 and 78dd-2 (\"FCPA\"), the anti-corruption laws of the US, the UK and any other applicable anti-corruption laws (collectively and individually, the \"Anti-Corruption Policy\"). Hiree hereby represents and warrants that Hiree is aware of the FCPA, which prohibits the bribery of public officials of any nation and has taken no action and will take no action which would be in violation of the FCPA, nor will Hiree cause Producer, its subsidiaries, assignees and/or affiliates to be in violation of the FCPA. Without limiting the generality of the foregoing, Hiree represents and warrants that Hiree has not and will not directly or indirectly make any payment(s) or give anything of value to any government employee or official with respect to the Program, or any activity related thereto for the purpose of influencing any decision and/or action of such government employee or official in his/her official capacity. Any violation of the Anti-Corruption Policy by Hiree will entitle Producer to immediately terminate this deal memo. The determination of whether Hiree has violated the Anti-Corruption Policy will be made by Producer in its sole discretion. Hiree will indemnify, defend and hold harmless Producer for any and all liability arising from any violation of the Anti-Corruption Policy caused or facilitated by Hiree." },
    fr: { n: "19", title: "CONFORMITE AVEC LE FOREIGN CORRUPT PRACTICES ACT", body: "Le Producteur a pour politique de se conformer pleinement au Foreign Corrupt Practices Act 15 U.S.C. Section 78dd-1 and 78dd-2 (\"FCPA\"), en vigueur aux États-Unis, aux lois anti-corruption des États-Unis, du Royaume-Uni et à toute autre loi anticorruption applicable (collectivement et individuellement, la «Politique Anticorruption»). Le Prestataire reconnaît et garantit qu’il est au courant du FCPA, qui interdit la corruption d'agents publics de toute nation et qu’il n'a pris aucune mesure et ne prendra aucune mesure qui serait en violation du FCPA, et l’Artiste ou qui placerait le Producteur, ses filiales, ses cessionnaires et/ou affiliés, en violation du FCPA. Sans limiter la portée générale de ce qui précède, le Prestataire déclare et garantit qu’il n'a fait ni ne fera directement ou indirectement aucun paiement, n’a donné ni ne donnera quelque chose de valeur à tout employé ou fonctionnaire du gouvernement dans le cadre du Programme ou de toute activité liée à celui-ci dans le but d'influencer des décisions et/ou des actions de cet employé ou fonctionnaire du gouvernement dans sa capacité officielle. Toute violation de la Politique Anti-Corruption par le Prestataire donnera droit au Producteur de résilier immédiatement les présentes. La détermination de savoir si le Prestataire a enfreint la Politique Anti-Corruption sera faite par le Producteur à sa seule discrétion. Le Prestataire indemnisera, défendra et dégagera le Producteur de toute responsabilité découlant de toute violation de la Politique Anticorruption causée ou facilitée par le Prestataire." },
  },
  {
    en: { n: "20", title: "USE OF PERSONAL DATA", body: "Hiree acknowledges that for purposes connected with this agreement, including compliance with this agreement and Producer’s legal and regulatory obligations in the normal course of a production (e.g., as part of completing customary tax, immigration and insurance documents, and other customary start paperwork), Producer will collect, use, store, and otherwise process certain individually identifiable information about Hiree, their relatives and associates (in the event such individuals are designated as emergency contacts or beneficiaries, for example) provided by Hiree, including without limitation personal data such as name, address, email address, government ID, banking and insurance information and sensitive personal data such as race or ethnic origin, health conditions (in the event Producer requires medical records or an exam in connection with the production), criminal convictions and history (in the event Producer requires a background check in accordance with its policies), and trade union information (collectively “Personal Data”). Hiree further acknowledges that the processing of Personal Data may involve transfer or disclosure to Producer’s affiliated companies, Producer’s employees and agents, and to third parties, including without limitation, third party service providers, external advisors, government agencies, regulators and authorities, courts and other tribunals and other persons connected with Producer and/or the Production and that such transfer may be to countries that may not provide a level of protection to Personal Data equivalent to that provided by Hiree’s home country, but in such instances Producer shall use reasonable endeavors to have in place adequate measures to ensure the security of the Personal Data. To ensure that the Personal Data remains as accurate as possible, Hiree hereby agrees to inform Producer as soon as reasonably practicable of any changes thereto. Hiree also represents and warrants that Hiree is authorized to disclose Personal Data to Producer. Producer hereby informs Hiree that Hiree may have certain rights in respect of Personal Data (such as access, rectification and portability) and that further information about Hiree’s rights and Producer's processing of personal data generally can be obtained upon request from Producer." },
    fr: { n: "20", title: "TRAITEMENT DES DONNEES PERSONNELLES", body: "Le Prestataire reconnaît que, aux fins des présentes ainsi que dans le cadre du respect des obligations réciproques des parties et des obligations légales et réglementaires du Producteur inhérentes à la réalisation d'une production (par exemple, dans le cadre de la préparation de la documentation douanière, d'immigration, d'assurance et des autres formalités administratives habituelles), le Producteur collectera, utilisera, stockera et traitera certaines informations individuelles relatives au Prestataire, ses ayants-droits et ses connaissances (dans le cas où ces personnes sont désignées comme contacts d'urgence ou bénéficiaires, par exemple) fournies par le Prestataire, y compris, sans que cette liste ne soit limitative, des données personnelles telles que nom, adresse, adresse e-mail, carte d'identité délivrée par le gouvernement, informations bancaires et d'assurance et données personnelles sensibles telles que la race ou l'origine ethnique, les conditions de santé (dans le cas où le Producteur nécessite un dossier médical ou un examen en rapport avec la production), les condamnations pénales et les antécédents (dans le cas où le Producteur exige une vérification des antécédents conformément à ses politiques), et les informations sur son appartenance syndicale (collectivement, les «Données Personnelles»). Le Prestataire reconnaît en outre que le traitement des données personnelles peut impliquer un transfert ou une divulgation aux sociétés affiliées du Producteur, aux employés et agents du Producteur et à des tiers, y compris, sans s'y limiter, des prestataires de services tiers, des conseillers externes, des agences gouvernementales, des régulateurs et autorités, des tribunaux et autres autorités judiciaires et autres personnes liées au Producteur et/ou à la Production et que ce transfert peut être vers des pays susceptibles ne pas fournir un niveau de protection des Données Personnelles équivalent à celui fourni par le pays d'origine du Prestataire, mais que, dans de tels cas, le Producteur fera tous les efforts raisonnables pour mettre en place des mesures adéquates visant à assurer la sécurité des Données Personnelles. Pour s’assurer que les Données Personnelles demeurent aussi correctes que possible, le Prestataire s'engage à informer le Producteur dès que raisonnablement possible de tout changement apporté à ces dernières. Le Prestataire déclare et garantit également qu'il est autorisé à divulguer les Données Personnelles au Producteur. Le Producteur informe par les présentes le Prestataire que ce dernier peut avoir certains droits en ce qui concerne les Données Personnelles (telles que l'accès, la rectification et la portabilité) et que de plus amples informations sur ces droits et sur le traitement des Données Personnelles par le Producteur peuvent être obtenues sur demande auprès du Producteur." },
  },
  {
    en: { n: "21", title: "ATTACHMENTS", body: "Hiree acknowledges by signing below the receipt of the following policy documents and agrees to read and abide by them: Commitment to Respect. Production Policies & Procedures. Conflict of Interest." },
    fr: { n: "21", title: "PIECES JOINTES", body: "L'employé reconnaît en signant ci-dessous la réception des documents suivants et accepte de les lire et de les respecter: Commitment to Respect. Production Policies & Procedures. Conflict of Interest." },
  },
];

const page4Pairs: ClausePair[] = [
  {
    en: { n: "22", title: "ENTIRE AGREEMENT/ASSIGNMENT", body: "This deal memo sets forth the entire understanding of the parties regarding the subject matter and may not be amended except by a written instrument signed by the parties and only to modify its duration or Hiree’s compensation. Any other amendment shall require the conclusion of a new deal memo. In the event that regulations related to the mandatory terms and conditions of artistic contracts were to be enacted pursuant to section 11 of Law n° 68-16 after the conclusion of this contract, the parties agree to conclude a contract based on the model established by said regulations but on the basis of the hereby agreed terms and conditions. This deal memo is non-assignable by Hiree. This deal memo may be freely assigned and licensed by Producer in whole or in part to any party and in such event; this deal memo shall remain binding upon Hiree and inure to the benefit of any such assignee or licensee. Producer shall secondarily remain liable for its obligations hereunder unless such assignment is to: (a) a major motion film company which assumes in writing all of Producer’s obligations hereunder; (b) an entity into which Producer merges or is consolidated; (c) any successor entity or any entity which acquires all or substantially all of Producer’s business and assets; (d) a person or entity which is under common control with or controls Producer; or (e) any other financially responsible party who assumes in writing the performance and obligations of Producer hereunder to be performed from and after such assignment; in which event such assignment shall be deemed a novation forever releasing Producer from any further liability or obligation to Hiree. Any assignment by Producer of this deal memo or its rights and obligations hereunder shall not be deemed an election to abandon the Program." },
    fr: { n: "22", title: "ENTIERETE DE L’ACCORD/TRANSFERT", body: "Ce contrat d’engagement constitue l’entièreté de l’accord conclu entre parties en rapport avec son objet et ne peut être modifié ou amendé que par un acte écrit signé par les parties et uniquement en vue de modifier sa durée ou la rémunération du Prestataire. Toute autre modification nécessitera la conclusion d'un nouveau contrat d’engagement. Dans le cas où des textes réglementaires relatifs aux clauses et données que doit comporter le contrat-type artistique venaient à être promulgués en vertu de l'article 11 de la loi n° 68-16 après la conclusion du présent contrat, les parties conviennent de conclure un nouveau contrat sur la base du contrat-type établi par ces textes réglementaires, mais sur la base des termes et conditions convenus aux présentes. Ce contrat d’engagement n'est pas transférable par le Prestataire. Le présent contrat d’engagement peut être librement attribué et transféré par le Producteur en tout ou en partie à tout tiers et, dans ce cas, le Prestataire demeurera lié par les présentes qui bénéficieront au cessionnaire ou au titulaire de la licence. Le Producteur demeurera subsidiairement tenu de ses obligations au titre présentes, à moins que ce transfert soit en faveur de: (a) une société de cinéma majeure qui assumerait par écrit toutes les obligations du Producteur au titre des présentes; (b) une entité avec laquelle le Producteur fusionne ou est consolidée; (c) toute entité qui succéderait au Producteur ou qui acquerrait la totalité ou la quasi-totalité des activités et des actifs du Producteur; (d) une personne ou une entité qui serait sous contrôle commun ou qui contrôlerait le Producteur; ou (e) toute autre partie financièrement responsable qui assumerait par écrit l'exécution et les obligations du Producteur au titre des présentes pour être exécutées à partir de ce transfert et après ce transfert; auquel cas ce transfert sera considéré comme une novation libérant définitivement le Producteur de toute autre responsabilité ou obligation envers le Prestataire. Toute cession par le Producteur du présent contrat d’engagement ou de ses droits et obligations en vertu des présentes ne sera pas considérée comme une décision d’abandonner le Programme." },
  },
  {
    en: { n: "23", title: "GOVERNING LAW/COMPETENT JURISDICTION", body: "This deal memo and any dispute or claim of whatever nature which may arise out of or in connection with this deal memo (“Dispute”) shall be construed under and governed by the laws of the Kingdom of Morocco. In the event that a Dispute arises, then either party may submit the Dispute to the International Chamber of Commerce (ICC) in accordance with the Arbitration Rules of the ICC in effect as of the date of arbitration, which rules are deemed to be incorporated by reference in this clause, except that the parties shall jointly select a single arbitrator within 30 days of the respondent’s receipt of the request for arbitration. All costs and expenses of the arbitral tribunal and of the arbitral institution shall be borne by the parties equally. The arbitral award shall be final and binding on the parties." },
    fr: { n: "23", title: "DROIT APPLICABLE/JURIDICTION COMPETENTE", body: "Le présent contrat d’engagement et tout litige ou réclamation de quelque nature qui pourrait naître des présentes ou en relation avec les présentes («Litige») sont régi par les lois du Royaume du Maroc. Dans l’éventualité d’un Litige, chacune des parties pourra soumettre le Litige à la Chambre de Commerce Internationale (ICC) suivant le Règlement d’Arbitrage de la Chambre de Commerce Internationale en vigueur au moment de l’arbitrage lequel Règlement est intégré par renvoi aux présentes, à l’exception, toutefois, que les Parties devront nommer conjointement un arbitre unique dans le délai de 30 jours de la réception, par le défendeur, de la requête d’arbitrage. Tous les coûts et frais du tribunal arbitral seront supportés par les Parties à parts égales. La sentence arbitrale sera définitive." },
  },
];

function drawPageOne(pdf: jsPDF, member: CrewMember) {
  drawHeader(pdf);
  drawTableGrid(pdf);
  drawTableText(pdf, member);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  const termsIntro = "The services hereunder are subject to the terms and conditions below.";
  pdf.text(termsIntro, 23, 428);
  const frenchIntroX = 23 + pdf.getTextWidth(termsIntro) + 6;
  pdf.setFont("helvetica", "italic");
  pdf.text("(Les services objet des présentes sont soumis aux termes et conditions ci-dessous)", frenchIntroX, 428);

  let y = 458;
  page1Pairs.forEach((pair, index) => {
    y = clausePair(pdf, pair, y, { size: 7.1, leading: 9.3, gap: index === 0 ? 20 : 17 });
  });
}

function drawPageTwo(pdf: jsPDF) {
  let y = 48;
  page2Pairs.forEach((pair, index) => {
    const gaps = [18, 19, 19, 20, 18, 20, 17, 17, 17, 17, 0];
    y = clausePair(pdf, pair, y, { size: 7.15, leading: 8.4, gap: gaps[index] ?? 17, leftX: 40, rightX: 314, width: 255 });
  });
}

function drawPageThree(pdf: jsPDF) {
  let y = 48;
  page3Pairs.forEach((pair, index) => {
    const gaps = [26, 28, 88, 7, 0];
    y = clausePair(pdf, pair, y, { size: 7.15, leading: 8.15, gap: gaps[index] ?? 18, leftX: 34, rightX: 316, width: 252 });
  });
}

function bulletList(pdf: jsPDF, x: number, y: number) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  ["Anti Corruption Policy (FCPA)", "Safety Guidelines (International)", "Talent & Crew Privacy Notice"].forEach((text, index) => {
    pdf.text("•", x, y + index * 10);
    pdf.text(text, x + 10, y + index * 10);
  });
}

function drawPageFour(pdf: jsPDF, member: CrewMember) {
  bulletList(pdf, 30, 42);
  bulletList(pdf, 310, 42);
  let y = 84;
  page4Pairs.forEach((pair, index) => {
    y = clausePair(pdf, pair, y, { size: 7.15, leading: 8.15, gap: index === 0 ? 28 : 0, leftX: 25, rightX: 310, width: 267 });
  });

  const sigY = 545;
  line(pdf, 32, sigY, 275, sigY, 1.2);
  line(pdf, 317, sigY, 565, sigY, 1.2);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.text("HIREE SIGNATURE", 32, sigY + 13);
  pdf.text("DATE", 205, sigY + 13);
  pdf.text("LINE PRODUCER SIGNATURE", 317, sigY + 13);
  pdf.text("DATE", 493, sigY + 13);
  pdf.setFillColor(LIGHT);
  pdf.rect(32, sigY + 18, 564, 24, "F");
  value(pdf, formatDate(member.end_date), 185, sigY + 31, { size: 9 });
}

export function createContractPdf(member: CrewMember) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
  pdf.setTextColor(BLACK);
  pdf.setDrawColor(BLACK);
  pdf.setLineWidth(1.2);

  drawPageOne(pdf, member);
  pdf.addPage();
  drawPageTwo(pdf);
  pdf.addPage();
  drawPageThree(pdf);
  pdf.addPage();
  drawPageFour(pdf, member);

  return pdf;
}
