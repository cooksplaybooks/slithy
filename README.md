# Slithy

A foundry for words that don't exist yet — and engraved portraits of what they'd be.

Type a word, or coin one, and the page invents a pronunciation, a part of speech,
a definition and a usage line for it, then draws the creature it describes.

Every illustration is generated procedurally from the letters of the word itself,
so the same word always produces the same beast. Nothing is fetched, nothing is
stored, and there is no image model involved — the engraving is cross-hatched onto
a canvas against a light source, seeded by a hash of the word.

Includes an annotated *Jabberwocky*, using Humpty Dumpty's own glosses from
*Through the Looking-Glass* where Carroll bothered to supply them.

## Running it

One self-contained file. Open `index.html`, or serve the folder with any static host.
No build step, no dependencies.
