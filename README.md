# Leshen Zhang — academic homepage

Static site (GitHub Pages). Content is generated from the CV source so the two never drift.

- `template.html` — hand-written parts (About, figure, Software, tracker snippet).
- `build.py` — parses `../cv/CV-PhD/main.tex` (research projects, publications, honors, talks) into `index.html` and copies the compiled CV PDF to `cv/Leshen_Zhang_CV.pdf`.
- `./update.sh "msg"` — rebuild + commit + push.

Visit tracking: GoatCounter (`leshenzhang.goatcounter.com`). Give each recipient a unique link, e.g. `https://<domain>/?ref=kulik`; it appears as the referrer in the dashboard.
