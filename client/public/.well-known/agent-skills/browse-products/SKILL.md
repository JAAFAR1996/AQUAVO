---
name: browse-products
description: Browse and search AQUAVO aquarium products catalog. Use when searching for filters, heaters, air pumps, decorations, fish food, lighting, substrates, or any aquarium supplies. Supports search by name, category, or brand. Returns product listings with prices in Iraqi Dinar (IQD).
---

# Browse AQUAVO Products

Search and browse the AQUAVO product catalog via API.

## Usage

Send a GET request to the products endpoint:

```
GET https://www.aquavoiq.com/api/products
```

### Query Parameters

| Parameter  | Type   | Description                    |
|------------|--------|--------------------------------|
| `search`   | string | Search query for products      |
| `category` | string | Filter by product category     |
| `brand`    | string | Filter by brand                |

### Example

```bash
curl "https://www.aquavoiq.com/api/products?search=filter&category=filters"
```

### Response

Returns a JSON array of product objects with: `id`, `name`, `price`, `category`, `brand`, `image`, `slug`, `stock`.
