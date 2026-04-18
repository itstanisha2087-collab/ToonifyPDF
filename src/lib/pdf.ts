/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjs from 'pdfjs-dist';
// @ts-ignore - Vite handles the ?url suffix
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Use Vite's worker loading
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}
