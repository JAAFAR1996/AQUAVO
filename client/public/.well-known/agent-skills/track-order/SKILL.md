---
name: track-order
description: Track an AQUAVO order by order number. Use when a customer wants to check order status, estimated delivery date, or shipment tracking. Requires the order number (e.g., FW-260424-0001).
---

# Track Order

Track AQUAVO orders by order number via API.

## Usage

```
GET https://www.aquavoiq.com/api/orders/track/{orderNumber}
```

### Path Parameters

| Parameter     | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| `orderNumber` | string | Yes      | Order number (e.g., FW-260424-0001)  |

### Example

```bash
curl "https://www.aquavoiq.com/api/orders/track/FW-260424-0001"
```

### Response

Returns order tracking info: `id`, `orderNumber`, `status`, `total`, `createdAt`, `estimatedDelivery`, `items`.

Status values: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
