---
name: track-order
description: Track an AQUAVO order using the order number and the last four digits of the customer phone.
---

# Track Order

Track AQUAVO orders only after the customer supplies both required verifiers.

## Usage

```
POST https://www.aquavoiq.com/api/orders/track/{orderNumber}
```

### Path Parameters

| Parameter     | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| `orderNumber` | string | Yes      | Order number (e.g., FW-260424-0001)  |

### JSON Body

| Parameter    | Type   | Required | Description                                      |
|--------------|--------|----------|--------------------------------------------------|
| `phoneLast4` | string | Yes      | Last four digits of the phone used for the order |

### Example

```bash
curl -X POST "https://www.aquavoiq.com/api/orders/track/FW-260424-0001" \
  -H "Content-Type: application/json" \
  -d '{"phoneLast4":"1234"}'
```

### Response

Returns only the minimum tracking info: `orderNumber`, `status`, `createdAt`, `updatedAt`, and `estimatedDelivery`. A failed lookup or verifier returns the same generic response.

Status values: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
