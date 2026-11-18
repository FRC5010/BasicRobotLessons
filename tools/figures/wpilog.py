"""A small reader for WPILib's DataLog (.wpilog) files, so the figure generators can read
the logs AdvantageKit writes. Handles the types the lesson figures use: boolean, double,
float, int64, string, and the array versions of double/float/int64.

    import wpilog
    log = wpilog.read("logs/akit_26-11-18_10-00-00.wpilog")
    t, v = log["/RealOutputs/Elevator/GoalMeters"]    # seconds, values

Format: https://github.com/wpilibsuite/allwpilib/blob/main/datalog/doc/datalog.adoc
"""

import struct


def _uint(b):
    return int.from_bytes(b, "little")


def read(path):
    """Return {entry name: (times in seconds, values)} for every entry in the file."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:6] != b"WPILOG":
        raise ValueError("not a wpilog file")
    pos = 8
    pos += 4 + _uint(data[pos:pos + 4])  # extra header string
    entries = {}  # id -> (name, type)
    out = {}
    n = len(data)
    while pos < n:
        flags = data[pos]
        id_len = (flags & 3) + 1
        size_len = ((flags >> 2) & 3) + 1
        ts_len = ((flags >> 4) & 7) + 1
        pos += 1
        eid = _uint(data[pos:pos + id_len]); pos += id_len
        size = _uint(data[pos:pos + size_len]); pos += size_len
        ts = _uint(data[pos:pos + ts_len]); pos += ts_len
        payload = data[pos:pos + size]; pos += size
        if eid == 0:  # control record
            kind = payload[0]
            if kind == 0:  # start
                new_id = _uint(payload[1:5])
                nl = _uint(payload[5:9])
                name = payload[9:9 + nl].decode("utf-8", "replace")
                p = 9 + nl
                tl = _uint(payload[p:p + 4])
                typ = payload[p + 4:p + 4 + tl].decode("utf-8", "replace")
                entries[new_id] = (name, typ)
                out.setdefault(name, ([], []))
            continue
        if eid not in entries:
            continue
        name, typ = entries[eid]
        out[name][0].append(ts / 1e6)
        out[name][1].append(_decode(typ, payload))
    return out


def _decode(typ, p):
    if typ == "boolean":
        return bool(p[0])
    if typ == "double":
        return struct.unpack("<d", p)[0]
    if typ == "float":
        return struct.unpack("<f", p)[0]
    if typ == "int64":
        return struct.unpack("<q", p)[0]
    if typ == "string":
        return p.decode("utf-8", "replace")
    if typ == "double[]":
        return list(struct.unpack("<%dd" % (len(p) // 8), p))
    if typ == "float[]":
        return list(struct.unpack("<%df" % (len(p) // 4), p))
    if typ == "int64[]":
        return list(struct.unpack("<%dq" % (len(p) // 8), p))
    return p  # raw bytes (structs, protobuf, ...)
