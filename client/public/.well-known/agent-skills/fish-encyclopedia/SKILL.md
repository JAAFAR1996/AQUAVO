---
name: fish-encyclopedia
description: Access the AQUAVO comprehensive fish species database. Use when looking up fish care guides, compatibility information, tank requirements, breeding tips, or identifying fish species. Covers freshwater tropical fish popular in Iraq.
---

# Fish Encyclopedia

Access the AQUAVO fish species database via API.

## Usage

```
GET https://www.aquavoiq.com/api/fish
```

### Query Parameters

| Parameter | Type   | Description                     |
|-----------|--------|---------------------------------|
| `search`  | string | Search fish by name or species  |

### Example

```bash
curl "https://www.aquavoiq.com/api/fish?search=guppy"
```

### Response

Returns fish species with: `name`, `scientificName`, `careLevel`, `temperament`, `tankSize`, `temperature`, `ph`, `diet`, `compatibility`.
