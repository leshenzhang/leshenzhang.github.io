#!/usr/bin/env python3
"""Build index.html from the CV source (../cv/CV-PhD/main.tex) so the site never drifts from the CV.

Usage:  python3 build.py            # regenerate index.html + copy the compiled CV PDF
        ./update.sh                 # rebuild, commit, push (site goes live in ~1 min)
Hand-written text (bio, research overview, news) lives in template.html; everything
list-like (publications, research projects, honors, talks) is parsed from the CV.
"""
import datetime, hashlib, html, pathlib, re, shutil

HERE = pathlib.Path(__file__).resolve().parent
CV_DIR = HERE.parent / "cv" / "CV-PhD"
TEX = (CV_DIR / "main.tex").read_text(encoding="utf-8")


def brace(s, i):
    """index of the brace matching s[i] == '{'"""
    d = 0
    for k in range(i, len(s)):
        d += s[k] == "{"
        d -= s[k] == "}"
        if d == 0:
            return k
    raise ValueError("unbalanced braces")


def latex_to_html(s):
    s = s.replace("\\me", "\x00ME\x00").replace("\\eq", "\x00EQ\x00")
    s = re.sub(r"\\hypertarget\{[^}]*\}\{\}", "", s)            # PDF-only anchors
    s = re.sub(r"\\hyperlink\{[^}]*\}", "", s)                   # keep the link text
    s = re.sub(r"\\hspace\*\{\\fill\}", "", s)
    s = s.replace("\\\\*", "\n").replace("\\\\", "\n")
    s = s.replace("~", " ").replace("---", "—").replace("--", "–").replace("\\&", "&")
    s = s.replace("\\textbullet{}", "•").replace("\\textrightarrow{}", "→").replace("\\textbar{}", "|")
    s = s.replace("`", "‘").replace("'", "’")
    s = s.replace("$\\times$", "×").replace("$\\rho$", "ρ").replace("``", "“").replace("''", "”")
    s = html.escape(s, quote=False)
    # \href{url}{text}
    while "\\href{" in s:
        i = s.index("\\href{")
        j = brace(s, i + 5)
        k = brace(s, j + 1)
        url, txt = s[i + 6:j], s[j + 2:k]
        ev = f' data-goatcounter-click="pdf:{url.split("//", 1)[-1]}"' if "pdf" in url.lower() else ""
        s = s[:i] + f'<a href="{url}"{ev}>{txt}</a>' + s[k + 1:]
    for cmd, tag in (("textsubscript", "sub"), ("textsuperscript", "sup"), ("textbf", "strong"),
                     ("textit", "em"), ("underline", "u"), ("small", "")):
        while "\\" + cmd + "{" in s:
            i = s.index("\\" + cmd + "{")
            j = brace(s, i + len(cmd) + 1)
            inner = s[i + len(cmd) + 2:j]
            s = s[:i] + (f"<{tag}>{inner}</{tag}>" if tag else inner) + s[j + 1:]
    s = s.replace("{\\small", "").replace("\\textdaggerdbl", "‡")
    s = s.replace("\x00ME\x00", '<strong class="me">Leshen Zhang</strong>').replace("\x00EQ\x00", "<sup>‡</sup>")
    s = re.sub(r"\\[a-zA-Z]+\*?", "", s)          # drop any leftover macro names
    s = s.replace("{", "").replace("}", "")
    return re.sub(r"[ \t]+", " ", s).strip()


def section(name):
    m = re.search(r"\\begin\{rSection\}\{" + re.escape(name) + r"[^\n]*\n(.*?)\\end\{rSection\}", TEX, re.S)
    return m.group(1) if m else ""


def tile_text(venue, journal):
    """Placeholder for papers without a figure: publication status (from the CV line) + journal."""
    v = venue.lower()
    status = "Under review" if "under review" in v else "To be submitted" if "to be submitted" in v else ""
    return "<br>".join(x for x in (f"<b>{status}</b>" if status else "", journal) if x)


def publications(name):
    """One row per paper, as on kovenyu.com: thumbnail | title / authors / venue + links / author role."""
    out = []
    for m in re.finditer(r"\\item\[\\textbf\{\[([JS]\.\d)\]\}\] (.*)", section(name)):
        tag, body = m.group(1), re.sub(r"\\hypertarget\{[^}]*\}\{\}", "", m.group(2))
        top, _, bottom = body.partition("\\\\")
        t = re.search(r"(?:\\href\{([^}]*)\}\{)?\\textbf\{((?:[^{}]|\{[^{}]*\})*)\}\}?\.\s*$", top.strip())
        doi_url, title = t.group(1), latex_to_html(t.group(2))
        authors = latex_to_html(top.strip()[:t.start()].strip().rstrip("."))
        links = re.findall(r"\\href\{([^}]*)\}\{\[(PDF|DOI)\]\}", bottom)
        role = re.search(r"\(([^()]*)\)\s*$", bottom.strip())
        journal = re.search(r"\\textit\{([^}]*)\}", bottom)
        venue = re.sub(r"\\href\{[^}]*\}\{\[(PDF|DOI)\]\}", "", bottom)
        venue = latex_to_html(venue[:venue.rindex("(")] if role else venue).strip().rstrip(".")
        jname = latex_to_html(journal.group(1)) if journal else "In preparation"
        venue = venue.replace(jname, f"<b>{jname}</b>", 1) if journal else venue
        thumb = HERE / "assets" / "thumbs" / (tag.replace(".", "") + ".jpg")
        pic = (f'<div class="thumb"><img src="assets/thumbs/{thumb.name}" alt="" loading="lazy"></div>' if thumb.exists()
               else f'<div class="thumb tile">{tile_text(venue, jname if journal else "")}</div>')
        ttl = f'<a href="{doi_url}">{title}</a>' if doi_url else title
        lk = "".join(f' / <a href="{u}"' + (f' data-goatcounter-click="pdf:{u.split("//", 1)[-1]}"' if k == "PDF" else "")
                     + f">{k}</a>" for u, k in links)
        out.append(f'<div class="pub" id="{tag}">{pic}<div><div class="pt">{ttl}</div><div class="pa">{authors}</div>'
                   f'<div class="pv"><span class="tag">[{tag}]</span>{venue}{lk}</div>'
                   + (f'<div class="pr">{role.group(1)}</div>' if role else "") + "</div></div>")
    return "\n".join(out)


def research():
    sec = section("Selected Research Experience")
    parts, items_open = [], False
    for line in sec.splitlines():
        line = line.strip()
        cat = re.search(r"\\textbf\{((?:I|II|III)\. [^}]*)\}\\par", line)
        sub = re.search(r"itshape (\([ab]\) [^}]*)\}\\par", line)
        item = re.match(r"(?:\\Needspace\{\d+\\baselineskip\})?\\item \\textbf\{(.*?)\} \\\\\*? (.*)", line)
        if cat:
            anchor = {"II": ' id="rc"', "III": ' id="rd"'}.get(cat.group(1).split(".")[0], "")
            parts.append(f"<h3{anchor}>{latex_to_html(cat.group(1))}</h3>")
        elif sub:
            parts.append(f'<h4 id="r{sub.group(1)[1]}">{latex_to_html(sub.group(1))}</h4>')
        elif item:
            title = latex_to_html(item.group(1))
            rest = latex_to_html(item.group(2)).split("\n")
            head = re.match(r"(?:(?:<strong>)?\[([JS]\.\d)\](?:</strong>)?)?\s*((?:<em>)?PI:.*)", rest[0].strip())
            tag, pi = (head.group(1), head.group(2)) if head else (None, "")
            text = "<br>".join(x.strip() for x in (rest[1:] if head else rest) if x.strip())
            ref = f' <a class="ref" href="#{tag}">[{tag}]</a>' if tag else ""
            parts.append(f'<div class="proj"><div class="ptitle">{title}{ref}</div>'
                         + (f'<div class="pi">{pi}</div>' if pi else "") + f"<p>{text}</p></div>")
    return "\n".join(parts)


def dated_items(name):
    out = []
    for m in re.finditer(r"\\item (.*?) \\hfill (?:\\mbox\{)?([^}\n]*?)\}?(?: \\\\)?\n(?:\s+(\\textit\{.*))?", section(name)):
        what, when, where = latex_to_html(m.group(1)), latex_to_html(m.group(2)), m.group(3)
        extra = f'<br><span class="where">{latex_to_html(where)}</span>' if where else ""
        out.append(f'<li><span class="when">{when}</span>{what}{extra}</li>')
    return "\n".join(out)


def awards():
    """Honors from the CV as 'name, date' bullets (two columns in the page)."""
    return "\n".join(f"<li>{m.group(2)}, <span class=\"nb\">{m.group(1)}</span></li>" for m in
                     re.finditer(r'<span class="when">(.*?)</span>(.*?)</li>', dated_items("Honors and Awards")))


def main():
    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    pdf = CV_DIR / "main.pdf"
    if pdf.exists():
        shutil.copy(pdf, HERE / "cv" / "Leshen_Zhang_CV.pdf")
    page = (tpl.replace("{{PUBLICATIONS}}", publications("Publications"))
               .replace("{{PREPRINTS}}", publications("Preprints"))
               .replace("{{RESEARCH}}", research())
               .replace("{{AWARDS}}", awards())
               .replace("{{TALKS}}", dated_items("Scientific Presentations"))
               .replace("{{UPDATED}}", datetime.date.today().strftime("%B %Y"))
               # content hash in the CV link: a new CV gets a new URL, so no browser/CDN serves a stale copy
               .replace("{{CVVER}}", hashlib.md5((HERE / "cv" / "Leshen_Zhang_CV.pdf").read_bytes()).hexdigest()[:8]))
    (HERE / "index.html").write_text(page, encoding="utf-8")
    print("index.html written:", len(page), "chars")


if __name__ == "__main__":
    main()
