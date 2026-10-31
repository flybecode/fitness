"""Erzeugt die App-Icons (weiße Hantel mit rotem Griff auf Schwarz) als PNG – ohne externe Bibliotheken.

Aufruf: python3 werkzeuge/icons_erzeugen.py
"""
import struct
import zlib
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "app" / "icons"
OBEN = (0, 0, 0)
UNTEN = (0, 0, 0)
WEISS = (242, 242, 242)
ROT = (255, 59, 47)
SS = 3  # Supersampling für weiche Kanten

# Rechtecke mit Eckradius in Einheitskoordinaten (0..1): x0, y0, x1, y1, r
FORMEN = [
    (0.14, 0.475, 0.86, 0.525, 0.0),  # Stange (rot)
    (0.24, 0.28, 0.33, 0.72, 0.035),  # große Scheiben
    (0.67, 0.28, 0.76, 0.72, 0.035),
    (0.165, 0.36, 0.24, 0.64, 0.03),  # kleine Scheiben
    (0.76, 0.36, 0.835, 0.64, 0.03),
]


def in_form(x, y):
    """Liefert die Farbe der obersten Form an dieser Stelle oder None."""
    treffer = None
    for i, (x0, y0, x1, y1, r) in enumerate(FORMEN):
        if x0 <= x <= x1 and y0 <= y <= y1:
            cx = min(max(x, x0 + r), x1 - r)
            cy = min(max(y, y0 + r), y1 - r)
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                treffer = ROT if i == 0 else WEISS
    return treffer


def png(groesse, pfad):
    zeilen = bytearray()
    n = groesse * SS
    for py in range(groesse):
        zeilen.append(0)
        t = py / (groesse - 1)
        bg = [round(OBEN[i] + (UNTEN[i] - OBEN[i]) * t) for i in range(3)]
        for px in range(groesse):
            summe = [0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    farbe = in_form((px * SS + sx + 0.5) / n, (py * SS + sy + 0.5) / n) or bg
                    for i in range(3):
                        summe[i] += farbe[i]
            zeilen.extend(round(v / (SS * SS)) for v in summe)

    def chunk(typ, daten):
        return struct.pack(">I", len(daten)) + typ + daten + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", groesse, groesse, 8, 2, 0, 0, 0)
    pfad.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(zeilen), 9)) + chunk(b"IEND", b""))
    print("erstellt", pfad.name)


if __name__ == "__main__":
    ZIEL.mkdir(parents=True, exist_ok=True)
    png(180, ZIEL / "apple-touch-icon.png")
    png(192, ZIEL / "icon-192.png")
    png(512, ZIEL / "icon-512.png")
