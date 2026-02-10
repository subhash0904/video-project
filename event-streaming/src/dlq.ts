/**
 * Dead-Letter Queue (DLQ)
 *
 * When a consumer fails to process a message after retries, the message
 * is published to a per-topic DLQ topic (e.g. video.views.dlq).
 * A separate process or manual review can inspect / replay them later.
 */

import { getProducer } from './kafka.js';
import { logger } from './logger.js';

const MAX_RETRIES = 3;

/** Metadata attached to every DLQ message. */
export interface DlqEnvelope {
  originalTopic: string;
  originalOffset: string;
  originalPartition: number;
  error: string;
  retryCount: number;
  failedAt: string;
  payload: string; // raw message value
}

/**
 * Send a failed message to the dead-letter topic.
 *
 * Convention: `<originalTopic>.dlq`
 */
export async function sendToDeadLetterQueue(
  originalTopic: string,
  partition: number,
  offset: string,
  rawValue: string,
  error: Error | string,
): Promise<void> {
  const dlqTopic = `${originalTopic}.dlq`;
  const envelope: DlqEnvelope = {
    originalTopic,
    originalOffset: offset,
    originalPartition: partition,
    error: typeof error === 'string' ? error : error.message,
    retryCount: MAX_RETRIES,
    failedAt: new Date().toISOString(),
    payload: rawValue,
  };

  try {
    const producer = await getProducer();
    await producer.send({
      topic: dlqTopic,
      messages: [
        {
          key: `${originalTopic}-${partition}-${offset}`,
          value: JSON.stringify(envelope),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.warn(`Message sent to DLQ ${dlqTopic}: partition=${partition} offset=${offset}`);
  } catch (dlqErr) {
    // If DLQ write itself fails, log and swallow — we don't want infinite loops
    logger.error(`Failed to write to DLQ ${dlqTopic}:`, dlqErr);
  }
}

/**
 * Wrap a per-message processing function with retry + DLQ logic.
 *
 * Usage inside `eachBatch`:
 * ```
 * await processWithDlq(topic, message, async (event) => { ... });
 * ```
 */
export async function processWithDlq<T>(
  topic: string,
  message: { partition: number; offset: string; value: Buffer | null },
  handler: (event: T) => Promise<void>,
): Promise<void> {
  const raw = message.value?.toString() ?? '';
  let event: T;
  try {
    event = JSON.parse(raw);
  } catch {
    // Un-parseable — straight to DLQ
    await sendToDeadLetterQueue(topic, message.partition, message.offset, raw, 'JSON parse error');
    return;
  }

  let lastErr: Error | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await handler(event);
      return; // success
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      logger.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${topic} offset=${message.offset}: ${lastErr.message}`);
      // Exponential back-off: 200ms, 400ms, 800ms
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
    }
  }

  // All retries exhausted → DLQ
  await sendToDeadLetterQueue(
    topic,
    message.partition,
    message.offset,
    raw,
    lastErr ?? 'Unknown error',
  );
}
