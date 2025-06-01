import { deflate, inflate } from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export interface CompressionConfig {
  compressionThreshold?: number;  // in bytes
  compressionLevel?: number;      // 0-9
}

export class MessageCompressor {
  private config: Required<CompressionConfig>;

  constructor(config: CompressionConfig = {}) {
    this.config = {
      compressionThreshold: config.compressionThreshold || 1024, // 1KB
      compressionLevel: config.compressionLevel || 6,
    };
  }

  public async compress(message: string): Promise<Buffer | string> {
    if (Buffer.byteLength(message) < this.config.compressionThreshold) {
      return message;
    }

    try {
      const compressed = await deflateAsync(message, {
        level: this.config.compressionLevel,
      });
      return compressed;
    } catch (error) {
      console.warn('Compression failed, sending uncompressed:', error);
      return message;
    }
  }

  public async decompress(data: Buffer | string): Promise<string> {
    if (typeof data === 'string') {
      return data;
    }

    try {
      const decompressed = await inflateAsync(data);
      return decompressed.toString();
    } catch (error) {
      throw new Error('Failed to decompress message: ' + error);
    }
  }

  public getStats(originalSize: number, compressedSize: number): {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    savings: number;
  } {
    return {
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      savings: ((originalSize - compressedSize) / originalSize) * 100,
    };
  }
} 