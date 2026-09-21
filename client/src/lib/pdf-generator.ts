/**
 * PDF Generator utility for breeding calculator
 * Handles PDF generation using html-to-image for better RTL/Arabic support
 */

import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

// Helper for development-only logging
const debugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[PDF Generator]', ...args);
  }
};

// Convert oklch colors to hex equivalents (Still useful for consistency)
function sanitizeColorsForCanvas(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*');

  // Default color map for common oklch values
  const colorMap: Record<string, string> = {
    'transparent': 'transparent',
  };

  const sanitizeColor = (color: string): string => {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return 'transparent';
    }
    if (color.includes('oklch')) {
      // Return a safe default instead of oklch
      return '#1e293b'; // slate-800
    }
    return color;
  };

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);

    // Force standard colors
    const bgColor = computed.backgroundColor;
    const textColor = computed.color;
    const borderColor = computed.borderColor;

    if (bgColor.includes('oklch')) {
      htmlEl.style.backgroundColor = '#ffffff';
    }
    if (textColor.includes('oklch')) {
      htmlEl.style.color = '#1e293b';
    }
    if (borderColor.includes('oklch')) {
      htmlEl.style.borderColor = '#e2e8f0';
    }
  });

  // Apply to root element too
  element.style.backgroundColor = '#ffffff';
  element.style.color = '#1e293b';
}

export async function generateBreedingPDF(elementId: string, fileName: string): Promise<void> {
  debugLog("Starting PDF generation...");
  debugLog("Element ID:", elementId);
  debugLog("File name:", fileName);

  try {
    // Find element
    const element = document.getElementById(elementId);
    if (!element) {
      console.error("[PDF Generator] Element not found with ID:", elementId);
      throw new Error(`لم يتم العثور على العنصر: ${elementId}`);
    }

    debugLog("Element found. Dimensions:", {
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    // Check if element is visible
    const rect = element.getBoundingClientRect();
    // Allow off-screen elements if they have dimensions defined
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      console.warn("[PDF Generator] Element has zero dimensions!");
      throw new Error("العنصر غير مرئي أو فارغ");
    }

    // Create a hidden clone for PDF generation with safe colors
    debugLog("Creating safe clone for PDF...");
    const clone = element.cloneNode(true) as HTMLElement;
    clone.id = 'pdf-temp-clone';
    Object.assign(clone.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '794px',
      backgroundColor: '#ffffff',
      padding: '20px',
      color: '#1e293b',
      direction: 'rtl',
      fontFamily: 'Tajawal, Arial, sans-serif',
      zIndex: '-9999',
      visibility: 'visible',
      opacity: '1'
    });

    // Append clone to body to ensure it renders
    document.body.appendChild(clone);

    // Sanitize all colors in the clone
    sanitizeColorsForCanvas(clone);

    // Give the browser a moment to render the clone's layout
    await new Promise(resolve => setTimeout(resolve, 500));

    debugLog("Capturing element as image...");

    // Generate PNG using html-to-image (Better RTL support than html2canvas)
    const imgData = await toPng(clone, {
      quality: 1.0,
      pixelRatio: 2, // 2x resolution for better print quality
      backgroundColor: '#ffffff',
      cacheBust: true, // Prevent caching issues
    });

    // Remove the clone
    document.body.removeChild(clone);

    debugLog("Image captured successfully");

    if (!imgData || imgData.length < 100) {
      throw new Error("فشل في تحويل الصورة");
    }

    // Create PDF
    debugLog("Creating PDF document...");
    // Load image to get dimensions
    const img = new Image();
    img.src = imgData;

    // Wait for image to load to get dimensions
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    debugLog("PDF page size:", {
      width: pdfWidth,
      height: pdfHeight
    });

    // Calculate dimensions to fit page (with margins)
    const margin = 10;
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - (margin * 2);

    // Calculate ratio based on the image dimensions vs available PDF space
    const ratio = Math.min(
      availableWidth / img.width,
      availableHeight / img.height
    );

    // Usually html-to-image with pixelRatio: 2 produces an image 2x the size.
    // We want it to fit on A4, effectively 'scaling down' the high-res image.
    const imgWidth = img.width * ratio;
    const imgHeight = img.height * ratio;

    const imgX = (pdfWidth - imgWidth) / 2;
    const imgY = margin;

    debugLog("Image placement:", {
      x: imgX,
      y: imgY,
      width: imgWidth,
      height: imgHeight,
    });

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');

    // Save PDF using blob download (more reliable than pdf.save())
    debugLog("Saving PDF as:", fileName);
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Cleanup blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    debugLog("PDF saved successfully!");

  } catch (error) {
    console.error("[PDF Generator] Error:", error);
    if (import.meta.env.DEV && error instanceof Error) {
      console.error("[PDF Generator] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
