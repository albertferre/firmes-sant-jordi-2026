# Procediment d'actualització de dades

## Fonts de dades

| Font | URL | Tipus | Notes |
|------|-----|-------|-------|
| Casa del Llibre | casadellibro.com/firmas-sant-jordi | PDFs descarregables | 3 ubicacions a BCN. PDFs amb horaris exactes |
| El Corte Inglés | elcorteingles.es/centroscomerciales/es/eci/agendas/San-Jordi-cataluna | Web | Sovint timeout, cal reintentar |
| beteve.cat (Flourish) | public.flourish.studio/visualisation/28186563/visualisation.json | JSON directe | Taula amb autors, ubicació, adreça, horari. ~187 entrades (ECI + Ona Llibres) |
| CASA SEAT | Xarxes socials / web CASA SEAT | Variada | Firmes pròpies |
| Editorials (Planeta, Anagrama, etc.) | Xarxes socials / notes de premsa | Variada | Confirmen autors setmanes abans |
| FNAC / Abacus | Webs respectives | Web | Solen publicar ~1-2 setmanes abans |
| Llibreries independents (Laie, etc.) | Xarxes socials / webs | Variada | Calendari propi |

## Format de dades (`signings.json`)

Cada entrada ha de tenir:

```json
{
  "id": "<prefix>-<number>",     // Ex: "cdl-04", "planeta-01"
  "author": "Nom Autor",
  "book": "",                     // Títol si es coneix
  "publisher": "Editorial",       // O font (Casa del Llibre, CASA SEAT...)
  "location": "Nom del lloc",
  "address": "Adreça completa",
  "coordinates": { "lat": 41.XXXX, "lng": 2.XXXX },
  "startTime": "HH:MM",          // Format 24h
  "endTime": "HH:MM"
}
```

### Prefixos d'ID per font

| Prefix | Font |
|--------|------|
| `planeta-` | Grup Planeta |
| `anagrama-` | Anagrama |
| `cdl-` | Casa del Llibre (firmes a les seves parades) |
| `eci-pgr-` | El Corte Inglés - Pg. de Gràcia |
| `eci-diag-` | El Corte Inglés - Av. Diagonal |
| `eci-cat1-` | El Corte Inglés - Pl. Catalunya (Carpa 1) |
| `eci-cat2-` | El Corte Inglés - Pl. Catalunya (Carpa 2) |
| `ona-` | Ona Llibres |
| `laie-` | Llibreria Laie |
| `varios-` | Altres / múltiples fonts |
| `jsif-` | Jordi Sierra i Fabra (confirmació individual) |

### Coordenades de les ubicacions conegudes

```
Casa del Llibre - Pg. Gràcia (Aragó-València):     41.3928, 2.1650
Casa del Llibre - Pg. Gràcia (Diputació-Consell):  41.3908, 2.1648
Casa del Llibre - Pg. Sant Joan:                    41.3920, 2.1750
El Corte Inglés - Pg. de Gràcia:                    41.3890, 2.1700
El Corte Inglés - Av. Diagonal:                     41.3945, 2.1545
El Corte Inglés - Pl. Catalunya (Carpa 1):           41.3874, 2.1700
El Corte Inglés - Pl. Catalunya (Carpa 2):           41.3874, 2.1696
Ona Llibres - Pg. de Gràcia:                        41.3915, 2.1650
Llibreria Laie:                                     41.3936, 2.1640
CASA SEAT:                                          41.3870, 2.1630
CCCB:                                               41.3836, 2.1673
Biblioteca Jaume Fuster:                            41.4089, 2.1514
```

## Pas a pas per actualitzar

### 1. Recollir dades noves

```bash
# beteve.cat / Flourish - descarregar JSON (ECI + Ona Llibres)
curl -sL "https://public.flourish.studio/visualisation/28186563/visualisation.json" -o /tmp/flourish_vis.json
python3 -c "
import json
with open('/tmp/flourish_vis.json') as f:
    data = json.load(f)
rows = data['data']['rows']
print(f'Columns: {rows[0]}')
print(f'Data rows: {len(rows)-1}')
for row in rows[1:]:
    print(f'{row[0]:30s} | {row[1]:20s} | {row[2]:30s} | {row[3]}')
"

# Casa del Llibre - descarregar PDFs
curl -sL -o /tmp/cdl-pgracia-av.pdf "https://imagessl.casadellibro.com/documentacion/sj-firmas-pgracia-entre-arago-i-valencia-a4-2025.pdf"
curl -sL -o /tmp/cdl-pgracia-dc.pdf "https://imagessl.casadellibro.com/documentacion/sj-firmas-pgracia-entre-diputacio-i-consell-de-cent--a4-2025.pdf"
curl -sL -o /tmp/cdl-psantjoan.pdf "https://imagessl.casadellibro.com/documentacion/sj-firmas-psantjoan-entre-ausias-marc-i-casp--a4-2025.pdf"

# Extraure text amb pdfplumber (pip install pdfplumber)
python3 -c "
import pdfplumber
for f in ['/tmp/cdl-pgracia-av.pdf', '/tmp/cdl-pgracia-dc.pdf', '/tmp/cdl-psantjoan.pdf']:
    with pdfplumber.open(f) as pdf:
        for page in pdf.pages:
            print(page.extract_text())
"
```

### 2. Comparar amb dades existents

Abans d'afegir, verificar duplicats:

```bash
# Llistar autors actuals
python3 -c "
import json
with open('src/data/signings.json') as f:
    data = json.load(f)
for e in sorted(data, key=lambda x: x['author']):
    print(f\"{e['author']:40s} | {e['location']:50s} | {e.get('startTime','')}\")
"
```

### 3. Integrar noves dades

**Regles de merge:**
- Si un autor existeix amb `location: "Per confirmar"` -> actualitzar amb les noves dades
- Si un autor ja té ubicació i les noves dades són per un altre lloc/hora -> afegir nova entrada (un autor pot firmar a múltiples llocs)
- Si un autor té múltiples franges horàries al mateix lloc -> crear una entrada per franja
- Mantenir sempre els IDs existents (no canviar IDs ja publicats)

### 4. Validar

```bash
# Comprovar JSON vàlid
python3 -c "import json; json.load(open('src/data/signings.json')); print('OK')"

# Estadístiques
python3 -c "
import json
with open('src/data/signings.json') as f:
    data = json.load(f)
total = len(data)
confirmed = sum(1 for e in data if e['location'] != 'Per confirmar')
with_time = sum(1 for e in data if e.get('startTime'))
print(f'Total: {total} | Amb ubicació: {confirmed} | Amb horari: {with_time}')
"

# Build
npm run build
```

### 5. Commit

```bash
git add src/data/signings.json
git commit -m "feat: update data with [font] signings ([N] total)"
```

## Calendari típic de publicació

| Quan | Què s'espera |
|------|-------------|
| Març | Editorials grans confirmen autors (sense horaris) |
| 1-2 setmanes abans (7-16 abril) | Horaris i ubicacions concretes |
| Última setmana (17-22 abril) | Canvis d'última hora, confirmacions finals |
| 23 abril (Sant Jordi) | Canvis en temps real |

## Problemes coneguts

- **El Corte Inglés**: La pàgina fa timeout freqüentment. Cal reintentar o buscar manualment.
- **beteve.cat / Flourish**: El JSON és accessible directament a `public.flourish.studio/visualisation/28186563/visualisation.json`. Les dades estan a `data.rows` (array d'arrays, primera fila = header). Inclou El Corte Inglés i Ona Llibres.
- **URLs dels PDFs de Casa del Llibre**: Contenen "2025" a la URL però són per l'edició actual. Caldrà actualitzar l'any si canvien els paths.
- **Autors amb múltiples sessions**: Un autor pot firmar a 2-3 franges horàries o a múltiples llocs. Cada sessió = una entrada separada al JSON.
