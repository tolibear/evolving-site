/**
 * StreamBuffer - Buffers terminal output and flushes in batches
 *
 * Accumulates output and triggers flush either when:
 * - Buffer reaches 4KB threshold
 * - 100ms has passed since first write to buffer
 */

export class StreamBuffer {
  private buffer: string = ''
  private flushTimer: NodeJS.Timeout | null = null
  private sequence: number = 0
  private isClosed: boolean = false

  private readonly FLUSH_INTERVAL = 100 // 100ms
  private readonly BUFFER_THRESHOLD = 4096 // 4KB

  constructor(
    private readonly onFlush: (sequence: number, content: string) => Promise<void>
  ) {}

  /**
   * Write data to the buffer
   * Automatically flushes when buffer threshold is reached
   */
  write(data: Buffer | string): void {
    if (this.isClosed) {
      console.warn('StreamBuffer: write called after close')
      return
    }

    const text = typeof data === 'string' ? data : data.toString()
    this.buffer += text

    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush()
      }, this.FLUSH_INTERVAL)
    }

    // Immediate flush if buffer exceeds threshold
    if (this.buffer.length >= this.BUFFER_THRESHOLD) {
      this.flush()
    }
  }

  /**
   * Flush the buffer, encoding as base64 and calling onFlush
   */
  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.buffer.length === 0) {
      return
    }

    const content = this.buffer
    this.buffer = ''
    const seq = this.sequence++

    // Encode content as base64 for safe transmission
    const base64Content = Buffer.from(content).toString('base64')

    try {
      await this.onFlush(seq, base64Content)
    } catch (error) {
      // Log but don't throw - we don't want to break the main process
      console.error(`StreamBuffer: flush error for sequence ${seq}:`, error)
    }
  }

  /**
   * Close the buffer, flushing any remaining content
   */
  async close(): Promise<void> {
    if (this.isClosed) return
    this.isClosed = true

    // Flush any remaining content
    await this.flush()
  }

  /**
   * Get current sequence number (useful for tracking)
   */
  getSequence(): number {
    return this.sequence
  }
}
