
import { Document } from '../types';

export const exportToTxt = (doc: Document) => {
  let content = `FICHE DE RÉVISION : ${doc.title.toUpperCase()}\n`;
  content += `Date : ${new Date(doc.date).toLocaleDateString()}\n`;
  content += `------------------------------------------\n\n`;
  
  content += `RÉSUMÉ :\n${doc.summary}\n\n`;
  
  if (doc.keyPoints && doc.keyPoints.length > 0) {
    content += `POINTS CLÉS :\n`;
    doc.keyPoints.forEach(p => content += `- ${p}\n`);
    content += `\n`;
  }
  
  if (doc.formulas && doc.formulas.length > 0) {
    content += `FORMULES ET DATES :\n`;
    doc.formulas.forEach(f => content += `- ${f}\n`);
    content += `\n`;
  }
  
  if (doc.definitions && doc.definitions.length > 0) {
    content += `LEXIQUE :\n`;
    doc.definitions.forEach(d => content += `${d.term.toUpperCase()} : ${d.definition}\n`);
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fiche_${doc.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToDoc = (doc: Document) => {
  const htmlHeader = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <style>
      body { font-family: 'Segoe UI', 'Arial', sans-serif; color: #334155; font-size: 8pt; }
      
      /* Blocs avec surlignage complet */
      .section-summary { 
        border-left: 8px solid #f59e0b; 
        padding: 10px; 
        background-color: #fef3c7; /* Surlignage orange bloc complet */
        margin-bottom: 20px; 
        border-top: 1px solid #fde68a;
        border-right: 1px solid #fde68a;
        border-bottom: 1px solid #fde68a;
      }
      .section-points { 
        border-left: 8px solid #10b981; 
        padding: 10px; 
        background-color: #dcfce7; /* Surlignage vert bloc complet */
        margin-top: 20px; 
        border-top: 1px solid #bbf7d0;
        border-right: 1px solid #bbf7d0;
        border-bottom: 1px solid #bbf7d0;
      }

      /* Titres de sections en 10pt */
      .title-summary { color: #d97706; font-weight: bold; font-size: 10pt; margin-bottom: 5px; text-transform: uppercase; }
      .header-blue { background-color: #3b82f6; color: white; padding: 5px; font-weight: bold; text-transform: uppercase; font-size: 10pt; }
      .header-pink { background-color: #ec4899; color: white; padding: 5px; font-weight: bold; text-transform: uppercase; font-size: 10pt; }
      .header-purple { background-color: #8b5cf6; color: white; padding: 5px; font-weight: bold; text-transform: uppercase; font-size: 10pt; }
      .title-points { color: #059669; font-weight: bold; font-size: 10pt; margin-bottom: 5px; text-transform: uppercase; }
      
      /* Titre de la fiche au milieu en 12pt */
      .star-title { 
        background-color: #4f46e5; 
        color: white; 
        padding: 25px 10px; 
        border-radius: 50%; 
        font-weight: bold; 
        font-size: 12pt; 
        text-align: center; 
      }
      
      .main-grid { width: 100%; border-collapse: collapse; }
      .side-col { width: 35%; vertical-align: top; }
      .center-col { width: 30%; vertical-align: middle; text-align: center; padding: 15px; }
      
      .box-blue { background-color: #eff6ff; border: 1px solid #bfdbfe; margin-bottom: 10px; }
      .box-pink { background-color: #fdf2f8; border: 1px solid #fbcfe8; margin-bottom: 10px; }
      .box-purple { background-color: #f5f3ff; border: 1px solid #ddd6fe; }
      
      /* Contenu en 8pt */
      .item-list { margin: 3px 0; font-size: 8pt; line-height: 1.2; }
      .def-term { font-weight: bold; color: #1e40af; text-transform: uppercase; font-size: 8pt; }
      .content-text { font-size: 8pt; line-height: 1.3; }
    </style>
    </head><body>
  `;

  let body = `
    <!-- L'ESSENTIEL -->
    <div class="section-summary">
      <div class="title-summary">L'Essentiel</div>
      <div class="content-text">${doc.summary}</div>
    </div>

    <table class="main-grid">
      <tr>
        <!-- VOCABULAIRE -->
        <td class="side-col">
          <div class="box-blue">
            <div class="header-blue">Vocabulaire</div>
            <div style="padding: 8px;">
              ${doc.definitions?.map(d => `<div class="item-list"><span class="def-term">${d.term}</span> : ${d.definition}</div>`).join('') || 'Aucun terme.'}
            </div>
          </div>
        </td>

        <!-- TITRE CENTRAL -->
        <td class="center-col">
          <div class="star-title">${doc.title}</div>
        </td>

        <!-- À RETENIR / CARTE MENTALE -->
        <td class="side-col">
          <div class="box-pink">
            <div class="header-pink">À Retenir</div>
            <div style="padding: 8px;">
              ${doc.formulas?.map(f => `<div class="item-list">• ${f}</div>`).join('') || 'Aucun point.'}
            </div>
          </div>

          ${doc.mindMaps && doc.mindMaps.length > 0 ? `
          <div class="box-purple">
            <div class="header-purple">Carte Mentale</div>
            <div style="padding: 10px; text-align: center; font-style: italic; color: #6d28d9; font-size: 7pt;">
              (Voir version interactive pour : ${doc.mindMaps[0].title})
            </div>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- POINTS CLÉS -->
    <div class="section-points">
      <div class="title-points">Points Clés</div>
      <div class="content-text">
        <ul style="margin: 0; padding-left: 20px;">
          ${doc.keyPoints?.map(p => `<li class="item-list">${p}</li>`).join('') || '<li>Aucun point.</li>'}
        </ul>
      </div>
    </div>
  `;

  const fullHtml = htmlHeader + body + "</body></html>";
  const blob = new Blob([fullHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fiche_${doc.title.replace(/\s+/g, '_').toLowerCase()}.doc`;
  link.click();
  URL.revokeObjectURL(url);
};
