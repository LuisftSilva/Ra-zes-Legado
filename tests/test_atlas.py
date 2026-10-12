#!/usr/bin/env python3
"""Offline contract checks for the public genealogy and interactive atlas."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/familia.json"

class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"): self.ids.add(a["id"])
        if tag == "script" and a.get("src"): self.refs.append(a["src"])
        if tag == "link" and a.get("rel") == "stylesheet": self.refs.append(a.get("href"))

class AtlasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA.read_text(encoding="utf-8"))
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "assets/atlas.js").read_text(encoding="utf-8")
        cls.parser = Tags()
        cls.parser.feed(cls.html)

    def test_family_integrity(self):
        people = self.data["people"]
        byid = {p["id"]: p for p in people}
        self.assertEqual(len(byid), len(people))
        self.assertGreaterEqual(len(people), 18)
        self.assertTrue(any(p["generation"] == 0 for p in people))
        for r in self.data["relations"]:
            self.assertIn(r["parent"], byid)
            self.assertIn(r["child"], byid)
            self.assertEqual(byid[r["parent"]]["generation"], byid[r["child"]]["generation"] + 1)

    def test_source_references(self):
        sources = {s["id"] for s in self.data["sources"]}
        for p in self.data["people"]:
            for sid in p.get("source_ids", []): self.assertIn(sid, sources)

    def test_public_data_privacy(self):
        raw = DATA.read_text(encoding="utf-8")
        for prohibited in ("Simão do Coelhoso", "Luís Filipe", "pai incógnito"):
            self.assertNotIn(prohibited, raw)
        for p in self.data["people"]:
            if p.get("life_status") != "deceased" or p.get("death", {}).get("confirmed") is not True:
                self.assertFalse(p.get("biography"), f"No public biography without confirmed death: {p['id']}")

    def test_interactive_structure(self):
        needed = ("graph","stars","search","branch","profile","profileName","parents",
                  "children","goAncestors","goDescendants","focusBanner","facts","sources",
                  "biography","zoomIn","zoomOut","zoomFit")
        for item in needed: self.assertIn(item, self.parser.ids)
        for asset in self.parser.refs: self.assertTrue((ROOT / asset).is_file(), asset)
        self.assertIn("assets/atlas.js", self.parser.refs)
        self.assertIn("assets/atlas.css", self.parser.refs)

    def test_living_privacy_guard(self):
        for marker in ("function confirmedDeath(", "function publicBio(", "p.life_status==='living'",
                       "relatedSet(", "function route(", "function focusRelatives(", "function graphGestures("):
            self.assertIn(marker, self.js)
        self.assertIn('noindex,nofollow,noarchive', self.html)

if __name__ == "__main__":
    unittest.main()
