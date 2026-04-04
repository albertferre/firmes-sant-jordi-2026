# Author JSON Schema

Template for `authors.json`. Each key is the author name.

```json
{
  "Author Name": {
    "name": "Author Name",
    "photo": "https://...",
    "bioEs": "Biography in Spanish",
    "bioCa": "Biography in Catalan",
    "generatedBioEs": "LLM-generated bio ES",
    "generatedBioCa": "LLM-generated bio CA",
    "presentingBook": "Book title being signed at Sant Jordi",
    "goodreadsUrl": "https://www.goodreads.com/author/show/...",
    "openLibraryUrl": "https://openlibrary.org/authors/...",
    "wikiUrl": "https://es.wikipedia.org/wiki/...",
    "planetaUrl": "https://www.planetadelibros.com/autor/...",
    "goodreadsFollowers": 1234,
    "books": [
      {
        "title": "Book Title",
        "cover": "https://...",
        "description": "Short description",
        "publishedDate": "2024",
        "publisher": "Editorial Name",
        "isbn": "9788412345678",
        "rating": "4.12",
        "ratingsCount": "15234",
        "url": "https://www.goodreads.com/book/show/..."
      }
    ],
    "links": {
      "goodreads": "https://...",
      "wikipediaEs": "https://...",
      "wikipediaCa": "https://...",
      "planeta": "https://...",
      "twitter": "https://...",
      "instagram": "https://..."
    }
  }
}
```

## Fields NOT at author level

- `rating` / `ratingsCount` — belong at **book level only**
- `sources` — pipeline internal, not for frontend
- `rawBooks` — stored in separate `raw-books.json`
