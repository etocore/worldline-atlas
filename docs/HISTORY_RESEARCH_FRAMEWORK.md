# Worldline history research framework

Worldline should not treat history as a single sequence of famous dates. The product combines several kinds of time that have different evidence, scales, and uncertainties.

## Editorial model

Each researched chapter has:

- a timeline scope: Earth History or Human History
- a bounded interval and a representative anchor time
- a plain-language title and synopsis
- a small set of changes that define the interval
- reviewed turning points inside the interval
- geographic lenses where location is meaningful
- themes used by search and related-content systems
- an explicit confidence statement
- source identifiers that resolve to versioned or institutional references

A chapter is an editorial navigation unit. It is not a claim that all places experienced change at the same moment or in the same way.

## Source hierarchy

### Earth time

1. International Commission on Stratigraphy for formal geological units and current boundary ages.
2. Pinned GPlates reconstruction models for plate geometry.
3. Peer-reviewed paleogeographic, paleoclimate, and paleobiological datasets for modeled conditions.
4. Paleobiology Database records for fossil occurrences.
5. NASA and major natural-history institutions for public explanations of planetary and biological evidence.

### Human time

1. Archaeological publications and institutional syntheses for prehistoric developments.
2. Smithsonian Human Origins for human evolution and behavior.
3. PeriodO for competing scholarly period definitions, never as a universal periodization.
4. Pleiades and World Historical Gazetteer for temporally qualified historical places and names.
5. Museum, archive, UNESCO, and university resources for reviewed thematic synthesis.
6. Wikipedia may supply a readable introductory synopsis, but never the atlas date, geography, confidence, or evidence classification.

## Global history rules

- Avoid presenting European labels such as “Middle Ages” or “Renaissance” as worldwide eras.
- Describe simultaneous regional developments rather than implying one center drove all change.
- Distinguish evidence from interpretation.
- Use date ranges when scholarship does not support a single year.
- Do not treat state borders as stable objects across time.
- Do not infer absence from missing archaeological or fossil records.
- Prefer common language in the primary interface; retain technical terminology in source details.
- Treat civilizations as changing networks of communities, institutions, environments, and places rather than timeless colored polygons.

## Interaction hierarchy

The compact timeline shows only:

1. selected time
2. chapter title
3. one-sentence orientation

Opening the chapter reveals, in order:

1. overview
2. what changed
3. key moments
4. where to explore
5. uncertainty and sources

This preserves a map-first interface while giving the selected time enough historical substance to feel intentional.

## Versioning

The history catalog is stored in `data/history/chronology.json` and carries its own version. Corrections must update the catalog version and retain source provenance. Exact dates should not silently change merely because an upstream website changed.

## Initial institutional sources

- International Commission on Stratigraphy: https://stratigraphy.org/chart/
- GPlates model documentation: https://gwsdoc.gplates.org/models/
- Paleobiology Database: https://paleobiodb.org/
- Smithsonian Human Origins: https://humanorigins.si.edu/
- PeriodO: https://perio.do/
- Pleiades: https://pleiades.stoa.org/
- World Historical Gazetteer: https://whgazetteer.org/
- British Museum: https://www.britishmuseum.org/
- Metropolitan Museum Timeline of Art History: https://www.metmuseum.org/toah/
- UNESCO Silk Roads Programme: https://www.unesco.org/en/silkroads
- NASA Earth and Moon science: https://science.nasa.gov/
