import { FC, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";

export const QrCode: FC<{
  value: string;
  logoSrc: string;
  setIsCreatingQRCode: (isCreating: boolean) => void;
  onSuccess?: (imageDataUrl: string) => void;
  showLogo?: boolean;
}> = ({ value, logoSrc, setIsCreatingQRCode, onSuccess, showLogo = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasGeneratedQRCode = useRef(false);

  // Memoize the QR code generation function to prevent multiple executions
  const generateQRCode = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsCreatingQRCode(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await QRCode.toCanvas(canvasRef.current, value, { errorCorrectionLevel: 'H', margin: 1, width: 500 });
      const ctx = canvasRef.current.getContext('2d')!;

      if (showLogo) {
        // Create a promise to handle logo loading and drawing
        const drawLogo = new Promise<void>((resolve) => {
          const logo = new Image();
          logo.src = logoSrc;
          logo.onload = () => {
            const size = canvasRef.current!.width * 0.2;
            const x = (canvasRef.current!.width - size) / 2;
            const y = (canvasRef.current!.height - size) / 2;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y, size, size);
            ctx.drawImage(logo, x, y, size, size);
            resolve();
          };
          logo.onerror = () => {
            // If logo fails to load, still resolve to continue
            console.warn('Logo failed to load:', logoSrc);
            resolve();
          };
        });

        // Wait for logo to be drawn, then call onSuccess
        await drawLogo;
      }
      onSuccess?.(ctx.canvas.toDataURL());
      setIsCreatingQRCode(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setIsCreatingQRCode(false);
    }
  }, [value, logoSrc]); // Only depend on the actual data that matters

  useEffect(() => {
    if (!hasGeneratedQRCode.current) {
      generateQRCode();
      hasGeneratedQRCode.current = true;
    }
  }, [generateQRCode]);

  return <canvas ref={canvasRef} width={500} height={500} />;
};
