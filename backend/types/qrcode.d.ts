declare module 'qrcode' {
  export interface QRCodeToBufferOptions {
    type?: 'png' | 'svg' | 'utf8';
    width?: number;
    margin?: number;
    scale?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
  }

  export function toBuffer(text: string | Buffer, options?: QRCodeToBufferOptions): Promise<Buffer>;
  export function toDataURL(text: string | Buffer, options?: any): Promise<string>;
  export function toString(text: string | Buffer, options?: any): Promise<string>;
}
