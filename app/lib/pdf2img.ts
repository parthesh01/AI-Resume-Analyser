export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
  }
  
  let pdfjsLib: any = null;
  let isLoading = false;
  let loadPromise: Promise<any> | null = null;
  
  async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;
  
    isLoading = true;
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
      // Set the worker source to use local file
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      pdfjsLib = lib;
      isLoading = false;
      return lib;
    }).catch((error) => {
      console.error("Failed to load PDF.js:", error);
      isLoading = false;
      throw error;
    });
  
    return loadPromise;
  }
  
  export async function convertPdfToImage(
    file: File
  ): Promise<PdfConversionResult> {
    try {
      console.log("Starting PDF conversion for file:", file.name);
      
      const lib = await loadPdfJs();
      console.log("PDF.js library loaded successfully");
  
      const arrayBuffer = await file.arrayBuffer();
      console.log("File converted to ArrayBuffer, size:", arrayBuffer.byteLength);
      
      const pdf = await lib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false
      }).promise;
      console.log("PDF document loaded, pages:", pdf.numPages);
      
      const page = await pdf.getPage(1);
      console.log("First page loaded");
  
      const viewport = page.getViewport({ scale: 2.0 }); // Reduced scale for better performance
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
  
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      console.log("Canvas created with dimensions:", canvas.width, "x", canvas.height);
  
      if (!context) {
        throw new Error("Failed to get canvas 2D context");
      }
      
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
  
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      console.log("Starting page render...");
      await page.render(renderContext).promise;
      console.log("Page render completed");
  
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log("Image blob created, size:", blob.size);
              // Create a File from the blob with the same name as the pdf
              const originalName = file.name.replace(/\.pdf$/i, "");
              const imageFile = new File([blob], `${originalName}.png`, {
                type: "image/png",
              });
  
              resolve({
                imageUrl: URL.createObjectURL(blob),
                file: imageFile,
              });
            } else {
              console.error("Failed to create image blob");
              resolve({
                imageUrl: "",
                file: null,
                error: "Failed to create image blob",
              });
            }
          },
          "image/png",
          0.95 // Slightly reduced quality for better performance
        );
      });
    } catch (err) {
      console.error("PDF conversion error:", err);
      return {
        imageUrl: "",
        file: null,
        error: `Failed to convert PDF: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }