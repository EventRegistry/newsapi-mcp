# Train Topic

Train a custom topic definition from your own documents.

## Endpoint

```
GET | POST http://analytics.eventregistry.org/api/v1/trainTopic
```

## Description

Build a topic definition by analyzing documents you provide. Documents are annotated and categorized; commonly mentioned concepts and categories receive higher weights in the resulting topic.

Training is a multi-step process controlled by the `action` parameter:

1. **`createTopic`** — Create a new topic. Returns a `uri` for subsequent calls.
2. **`addDocument`** — Add a document to the topic (repeat for each document).
3. **`finishTraining`** — Finalize training. Returns the `topic` property with the trained definition.
4. **`getTrainedTopic`** — Retrieve a previously trained topic.

## Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | Your API key |
| `action` | string | Step: `createTopic`, `addDocument`, `finishTraining`, `getTrainedTopic` |

### Action-Specific

| Parameter | Type | Relevant Action(s) | Description |
|-----------|------|---------------------|-------------|
| `name` | string | `createTopic` | Name of the topic |
| `uri` | string | `addDocument`, `finishTraining`, `getTrainedTopic` | Topic URI (from `createTopic` response) |
| `text` | string | `addDocument` | Document text to analyze |

### Optional (for `finishTraining`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxConcepts` | integer | `20` | Maximum concepts in final topic |
| `maxCategories` | integer | `10` | Maximum categories in final topic |
| `idfNormalization` | boolean | `true` | Punish commonly mentioned concepts |

## Example Workflow

### Step 1: Create topic

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/trainTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "action": "createTopic",
    "name": "Climate Policy"
  }'
# Response: { "uri": "topic-12345" }
```

### Step 2: Add documents (repeat)

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/trainTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "action": "addDocument",
    "uri": "topic-12345",
    "text": "The Paris Agreement aims to limit global warming..."
  }'
```

### Step 3: Finish training

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/trainTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "action": "finishTraining",
    "uri": "topic-12345",
    "maxConcepts": 20,
    "maxCategories": 10
  }'
# Response includes "topic" property with trained definition
```

### Step 4: Retrieve later

```bash
curl -X POST "http://analytics.eventregistry.org/api/v1/trainTopic" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "action": "getTrainedTopic",
    "uri": "topic-12345"
  }'
```
