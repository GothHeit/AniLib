"""Reads the names a font file answers to, so the subtitle renderer can fetch only the fonts a
script asks for. Covers TrueType, OpenType and collections (.ttc); other files give no names."""

import struct

# Family, full name, PostScript name, typographic family. ASS scripts may use any of them.
NAME_IDS = (1, 4, 6, 16)
WINDOWS = 3
MAC = 1


def _decode(platform: int, raw: bytes) -> str | None:
    try:
        return raw.decode("utf-16-be") if platform == WINDOWS else raw.decode("mac_roman")
    except UnicodeDecodeError:
        return None


def _names_at(data: bytes, offset: int) -> set[str]:
    num_tables = struct.unpack_from(">H", data, offset + 4)[0]
    for i in range(num_tables):
        tag, _, table, _ = struct.unpack_from(">4sIII", data, offset + 12 + 16 * i)
        if tag != b"name":
            continue
        _, count, strings = struct.unpack_from(">HHH", data, table)
        names: set[str] = set()
        for j in range(count):
            platform, _, _, name_id, length, start = struct.unpack_from(
                ">HHHHHH", data, table + 6 + 12 * j
            )
            if name_id not in NAME_IDS or platform not in (WINDOWS, MAC):
                continue
            begin = table + strings + start
            name = _decode(platform, data[begin : begin + length])
            if name and name.strip():
                names.add(name.strip())
        return names
    return set()


def font_names(data: bytes) -> set[str]:
    """Every family, full and PostScript name in the font; empty when it can't be read."""
    try:
        if data[:4] == b"ttcf":
            count = struct.unpack_from(">I", data, 8)[0]
            offsets = struct.unpack_from(f">{count}I", data, 12)
            return set().union(*(_names_at(data, o) for o in offsets))
        if data[:4] in (b"\x00\x01\x00\x00", b"OTTO", b"true"):
            return _names_at(data, 0)
    except struct.error:
        pass
    return set()
