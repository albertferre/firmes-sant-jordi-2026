# Procediment d'actualització de dades

## Script d'actualització automatitzat

```bash
# Mostra un informe comparatiu (no modifica res)
python3 scripts/update-signings.py

# Aplica les noves entrades detectades
python3 scripts/update-signings.py --apply

# Informe + recerca de noves fonts
python3 scripts/update-signings.py --research

# Tot: aplica + recerca
python3 scripts/update-signings.py --apply --research
```

L'script fa:
1. Descarrega i compara dades de **Flourish** (ECI + Ona Llibres) i **PDFs de Casa del Llibre**
2. Sondeja l'estat de les pàgines de Planeta, Penguin, FNAC, CdL
3. Detecta entrades noves, duplicades i variants ortogràfiques (fuzzy matching)
4. Amb `--research`: explora fonts addicionals (Abacus, La Central, Laie, Gremi, Ajuntament...)
5. Amb `--apply`: afegeix les entrades noves a `signings.json` amb IDs i coordenades correctes

## Fonts de dades

### Fonts automatitzades (scraper integrat)

| Font | URL | Tipus | Notes |
|------|-----|-------|-------|
| beteve.cat (Flourish) | `public.flourish.studio/visualisation/28186563/visualisation.json` | JSON directe | ~187 entrades (ECI + Ona Llibres). Dades a `data.rows` |
| Casa del Llibre | `imagessl.casadellibro.com/documentacion/sj-firmas-*-a4-2025.pdf` | PDFs | 3 ubicacions BCN. URLs amb "2025" serveixen l'edició actual. L'script prova 2026 primer |

### Fonts monitoritzades (probe automàtic)

L'script comprova si aquestes fonts ja tenen horaris disponibles:

| Font | URL | Estat típic |
|------|-----|-------------|
| Planeta de Libros | `planetadelibros.com/firmas-sant-jordi` | Activa ~2 setmanes abans |
| Penguin Random House | `santjordi.penguinllibres.com` | Activa ~1-2 setmanes abans |
| Penguin Libros (ES) | `santjordi.penguinlibros.com` | Activa ~1-2 setmanes abans |
| FNAC | `fnac.es/Firmas-de-libros-Sant-Jordi-2026-autores-y-horarios-en-Fnac/cp16524/w-4` | 403 o activa ~1 setmana abans |
| Casa del Llibre (web) | `casadellibro.com/firmas-sant-jordi` | Activa (amb links als PDFs) |

### Fonts explorades amb `--research`

| Font | URL | Què buscar |
|------|-----|------------|
| Abacus | `abacus.coop/ca/sant-jordi` | Firmes a botigues Abacus |
| La Central | `lacentral.com` | Firmes a La Central del Raval |
| Laie | `laie.es` | Firmes a Llibreria Laie |
| Gremi de Llibreters | `gremidellibreters.cat` | Informació general de parades |
| Ajuntament BCN | `barcelona.cat/santjordi/ca` | Superilla literària, permisos |
| beteve.cat agenda | `beteve.cat/agenda/sant-jordi-barcelona/` | Informació general + noves fonts |

### Fonts manuals (no automatitzables)

| Font | On buscar | Notes |
|------|-----------|-------|
| CASA SEAT | Xarxes socials / web CASA SEAT | Firmes pròpies |
| Editorials petites | Instagram / Twitter | Anuncien autors individualment |
| Llibreries independents | Xarxes socials / webs | Calendari propi |

## Format de dades (`signings.json`)

Cada entrada ha de tenir:

```json
{
  "id": "<prefix>-<number>",
  "author": "Nom Autor",
  "book": "",
  "publisher": "Editorial",
  "location": "Nom del lloc",
  "address": "Adreça completa",
  "coordinates": { "lat": 41.XXXX, "lng": 2.XXXX },
  "date": "2026-04-23",
  "startTime": "HH:MM",
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
| `fnac-` | FNAC (quan estigui disponible) |
| `abacus-` | Abacus (quan estigui disponible) |

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

## Procediment manual (quan cal afegir fonts noves)

### 1. Recollir dades noves

```bash
# Primer, executar l'script automatitzat amb recerca
python3 scripts/update-signings.py --research

# Si es detecten noves fonts amb dades (★), investigar manualment
# Per exemple, per a Abacus:
curl -sL "https://www.abacus.coop/ca/sant-jordi" | python3 -c "
import sys
html = sys.stdin.read()
# Buscar patrons de firmes
import re
for m in re.findall(r'(?:firma|signatura|dedicat)[^<]{0,200}', html, re.I):
    print(m[:150])
"
```

### 2. Comparar amb dades existents

```bash
# L'script ja fa la comparació, però per verificar manualment:
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
- Si un autor ja té ubicació i les noves dades són per un altre lloc/hora -> afegir nova entrada
- Si un autor té múltiples franges horàries al mateix lloc -> crear una entrada per franja
- Mantenir sempre els IDs existents (no canviar IDs ja publicats)

### 4. Validar

```bash
# Comprovar JSON vàlid + estadístiques
python3 -c "
import json
with open('src/data/signings.json') as f:
    data = json.load(f)
total = len(data)
confirmed = sum(1 for e in data if e['location'] != 'Per confirmar')
with_time = sum(1 for e in data if e.get('startTime'))
with_date = sum(1 for e in data if e.get('date'))
print(f'Total: {total} | Amb ubicació: {confirmed} | Amb horari: {with_time} | Amb data: {with_date}')
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

| Quan | Què s'espera | Acció |
|------|-------------|-------|
| Març | Editorials grans confirmen autors (sense horaris) | `python3 scripts/update-signings.py --research` |
| 1-2 setmanes abans (7-16 abril) | Horaris i ubicacions concretes | `python3 scripts/update-signings.py --apply` |
| Última setmana (17-22 abril) | Canvis d'última hora, confirmacions finals | Executar script diàriament |
| 23 abril (Sant Jordi) | Canvis en temps real | Actualització manual |

## Problemes coneguts

- **El Corte Inglés**: La pàgina fa timeout o retorna 403 freqüentment. Les dades d'ECI s'obtenen via Flourish/beteve.cat.
- **beteve.cat / Flourish**: El JSON és accessible directament. Les dades estan a `data.rows` (array d'arrays, primera fila = header). Inclou El Corte Inglés i Ona Llibres.
- **URLs dels PDFs de Casa del Llibre**: Contenen "2025" a la URL però serveixen l'edició actual. L'script prova primer les URLs amb "2026".
- **Autors amb múltiples sessions**: Un autor pot firmar a 2-3 franges horàries o a múltiples llocs. Cada sessió = una entrada separada al JSON.
- **Variants ortogràfiques**: L'script utilitza fuzzy matching (Levenshtein + bigrams) per detectar noms com "Eduardo Mendonza" vs "Eduardo Mendoza". Variants detectades es marquen amb ≈.
- **FNAC**: Retorna 403 amb fetches automatitzats. Cal consultar manualment o provar amb un navegador.
