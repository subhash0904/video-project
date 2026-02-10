# Event Streaming Service

High-throughput event streaming service using Kafka for processing real-time video platform events (views, likes, comments, subscriptions).

## Architecture

```
User Action (Like/View/Comment)
         ↓
    Kafka Topic
         ↓
  Event Consumer (Batch Processing)
         ↓
   Counter Aggregation (In-Memory)
         ↓
   Periodic Flush to Redis/DB
         ↓
  Real-time Counter Updates
```

## Features

- **Event-Driven Architecture**: Decoupled event processing for scalability
- **High Throughput**: Batch processing with Kafka for millions of events/sec
- **Counter Aggregation**: In-memory aggregation reduces DB load by 90%+
- **Fault Tolerance**: Automatic retries and dead letter queues
- **Real-time Updates**: Immediate counter updates in Redis for live display
- **Multi-Consumer**: Parallel processing for different event types

## Event Types

### Video Events
- `video.view` - Video view tracking
- `video.like` - Video liked
- `video.unlike` - Video unliked
- `video.dislike` - Video disliked
- `video.upload` - New video uploaded

### Comment Events
- `comment.create` - Comment created
- `comment.like` - Comment liked
- `comment.delete` - Comment deleted

### Subscription Events
- `subscription.create` - Channel subscribed
- `subscription.delete` - Channel unsubscribed

## Consumers

### View Consumer
- Processes video view events
- Tracks unique daily views
- Updates watch history
- Aggregates view counts

### Like Consumer
- Processes like/dislike events
- Updates video engagement metrics
- Feeds recommendation engine

### Comment Consumer
- Processes comment events
- Updates comment counts
- Tracks user engagement

### Subscription Consumer
- Processes subscription events
- Updates subscriber counts
- Maintains subscription lists

## Counter Aggregation

### Why Aggregation?

Without aggregation:
- 1M views = 1M database writes
- Database becomes bottleneck
- High latency

With aggregation:
- 1M views = 1M events → aggregated → 1 DB write every 30s
- 99%+ reduction in DB load
- Sub-millisecond latency

### How It Works

```typescript
// User likes video
publishEvent('video.likes', {
  type: 'video.like',
  videoId: '123',
  userId: '456'
});

// Consumer aggregates in memory
counterAggregator.increment('video:123:likes', 1);

// Flushed to Redis every 30 seconds
// Real-time display reads from Redis
```

## Configuration

See [.env.example](.env.example) for configuration options.

### Key Settings

```env
KAFKA_BROKERS=kafka:9092
BATCH_SIZE=100              # Events per batch
BATCH_TIMEOUT=5000          # Batch timeout (ms)
COUNTER_FLUSH_INTERVAL=30000 # Flush interval (ms)
```

## Usage

### Publishing Events

```typescript
import { publishEvent } from './kafka';
import { EventType } from './types';

// Publish a view event
await publishEvent('video.views', {
  type: EventType.VIDEO_VIEW,
  videoId: '123',
  userId: '456',
  timestamp: Date.now()
});

// Publish a like event
await publishEvent('video.likes', {
  type: EventType.VIDEO_LIKE,
  videoId: '123',
  userId: '456',
  timestamp: Date.now()
});
```

### Batch Publishing

```typescript
import { publishBatch } from './kafka';

const events = [
  { type: 'video.view', videoId: '1', userId: 'a' },
  { type: 'video.view', videoId: '2', userId: 'b' },
  { type: 'video.view', videoId: '3', userId: 'c' }
];

await publishBatch('video.views', events);
```

## Development

```bash
# Install dependencies
pnpm install

# Start producer service
pnpm dev

# Start consumers (separate terminal)
pnpm consumer

# Build
pnpm build

# Production
pnpm start
```

## Monitoring

### Consumer Metrics

Each consumer logs:
- Events processed per batch
- Processing time
- Error rates
- Offset commits

Example log:
```
Processing 100 view events
Successfully processed 100 view events in 45ms
```

### Counter Stats

```bash
# View aggregated counters in Redis
redis-cli hgetall counters:aggregated

# View persistent counters
redis-cli hgetall counters:persistent
```

## Scaling

### Horizontal Scaling

- Each consumer group can have multiple instances
- Kafka automatically distributes partitions
- Scale by adding more consumer instances

Example:
```bash
# Run 3 instances of each consumer
docker-compose up --scale event-consumer=3
```

### Partition Strategy

- Views: Partitioned by video_id (ensures ordering per video)
- Likes: Partitioned by user_id (prevents duplicate processing)
- Comments: Partitioned by video_id
- Subscriptions: Partitioned by channel_id

## Performance

### Throughput

- **Single consumer**: 10K-50K events/sec
- **10 consumers**: 100K-500K events/sec
- **100 consumers**: 1M+ events/sec

### Latency

- Event publish: < 5ms
- Event processing: < 50ms (batch mode)
- Counter update: < 1ms (Redis)
- DB flush: 30 seconds (configurable)

## Error Handling

### Retry Strategy

- Automatic retries with exponential backoff
- Max 10 retries per message
- Failed messages moved to dead letter queue

### Dead Letter Queue

Failed events are published to:
- `{topic}.dlq` (e.g., `video.views.dlq`)
- Manual review and reprocessing

## Integration

### Backend Integration

```typescript
// After user likes video
import { publishEvent } from '@/event-streaming/kafka';

await publishEvent('video.likes', {
  type: EventType.VIDEO_LIKE,
  videoId: req.params.videoId,
  userId: req.user.id,
  timestamp: Date.now()
});

// Return immediately (don't wait for processing)
res.json({ success: true });
```

### Real-time Counter Display

```typescript
// Get real-time view count
import { getCounter } from '@/event-streaming/redis';

const views = await getCounter(`video:${videoId}:views`);
```

## Docker

```bash
docker build -t event-streaming .
docker run -e KAFKA_BROKERS=kafka:9092 event-streaming
```
