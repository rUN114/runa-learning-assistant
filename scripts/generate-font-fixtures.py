"""Generate OFL fixtures from Adobe Source Han Sans SC Normal; requires fonttools."""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
font = TTFont(sys.argv[1])
options = subset.Options()
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=[ord("中")])
subsetter.subset(font)
for table in font["cmap"].tables:
    if table.isUnicode() and ord("中") in table.cmap:
        table.cmap[ord("塧")] = table.cmap.pop(ord("中"))
for record in font["name"].names:
    if record.nameID in (1, 3, 4, 6):
        name = "RunaTestGlyphs" if record.nameID == 6 else "Runa Test Glyphs"
        record.string = name.encode(record.getEncoding())
cff = font["CFF "].cff
cff.fontNames = ["RunaTestGlyphs"]
top = cff.topDictIndex[0]
top.FamilyName = top.FullName = "Runa Test Glyphs"
out = root / "tests" / "fixtures"
out.mkdir(parents=True, exist_ok=True)
for name, selection_format in [("ofl-font-fixture.otf", 3), ("encrypted-font-fixture.otf", 0)]:
    top.FDSelect.format = selection_format
    font.save(out / name)
    print("Generated", name)
