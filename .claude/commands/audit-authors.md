---
description: "Audit author data quality and completeness"
argument-hint: "[author-name|all|summary]"
---

# Author Data Quality Audit

Analyze `src/data/authors.json` for data quality issues and completeness gaps.

## What to check

Read `src/data/authors.json` and `src/data/signings.json`, then report:

### 1. Completeness Summary
For all authors, count and list:
- Missing photo (no `photo` field or empty)
- Missing bio ES (no `bioEs` or empty)
- Missing bio CA (no `bioCa` or empty)
- Missing books (no `books` or empty array)
- Missing presenting book (no `presentingBook` and no `book` in signings.json)
- Missing Goodreads link
- Missing Wikipedia link

### 2. Data Quality Issues
Check for:
- **Duplicate books**: same title appearing multiple times in an author's `books` array (normalize: lowercase, strip accents)
- **Wrong attribution**: compare author name against the book titles / descriptions — flag if description mentions a different author name
- **Placeholder bios**: bios that start with "Encuentra los", are URLs, or are shorter than 30 characters
- **Pixelated photos**: photos from `gr-assets.com` with `p5/` in URL (should be `p8/`)
- **Mixed language bios**: bioEs that appears to be in Catalan or English, bioCa that appears to be in Spanish or English
- **Book descriptions in wrong language**: descriptions in English or French instead of Spanish

### 3. Specific Author Report (if argument provided)
If an author name is given, show their complete data record formatted nicely, highlighting any issues.

### 4. Actionable Recommendations
Based on findings, suggest specific fixes:
- Which authors to re-scrape from which source
- Which bios need translation
- Which book lists need deduplication

## Output Format

Print results directly to conversation. Group by severity:
- 🔴 Critical gaps (famous authors missing key data)
- 🟡 Quality issues (duplicates, wrong language, placeholder text)
- 🟢 Completeness stats (percentages, counts)

Do NOT create files. Do NOT modify data. Analysis only.
