import zlib, struct

def png(size, path):
    m = size * 0.22
    rows = []
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            inside = m < x < size - m and m < y < size - m
            row += bytes((255, 255, 255)) if inside else bytes((17, 17, 17))
        rows.append(row)
    raw = b''.join(rows)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n'
                + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw))
                + chunk(b'IEND', b''))

png(192, 'chat/static/chat/icons/icon-192.png')
png(512, 'chat/static/chat/icons/icon-512.png')