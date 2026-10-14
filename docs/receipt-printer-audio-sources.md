# AQUAVO receipt printer audio — licensed source record

The receipt-printing interface is a stylized virtual **thermal receipt printer**, not an identifiable real physical printer model. Its sound uses **real recordings**, mixed for the approximately 2.6-second animation.

- [Receipt Printer 01](https://freesound.org/people/thepodcastdoctor/sounds/476011/) — recorded by **thepodcastdoctor** in a pharmacy using a Zoom H4n/Rode M5, original 3.134 sec, CC0.
- [Thermal Receipt Print & Cut](https://freesound.org/people/twisterad3/sounds/413838/) — recorded by **twisterad3** from a Star Micronics thermal printer printing and cutting, original 1.567 sec, CC0.

Both recordings are under [Creative Commons CC0](https://creativecommons.org/publicdomain/zero/1.0/). Commercial use and modification are permitted without attribution; sources are preserved for transparency.

Processing: pharmacy printer sped up by factor ~1.215 with FFmpeg's atempo (pitch-preserving) and trimmed to 2.60s; short real Star Micronics cutter excerpt blended at approximately 2.26s, with gentle gain limits. Encoded to 32kHz mono 112kbps MP3 (~39KB). No synthetic motor audio or artificial beeps.

Hosted on AQUAVO Cloudinary:
https://res.cloudinary.com/dyczh8ogv/video/upload/v1791985756/aquavo/ui/receipt-printer/real-thermal-receipt-print-cut-cc0-v1.mp3

Played through the Web Audio API: prefetched/primed on the customer's actual checkout confirmation gesture and replayed with the paper-feed animation. Browser autoplay restrictions remain in force for direct landings with no user engagement. Playback should be brief and not loop indefinitely.
