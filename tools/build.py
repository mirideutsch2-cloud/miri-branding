"""Trace the specimen sheets into OTF/WOFF2 fonts."""
import os, sys, statistics as st
import numpy as np, cv2, potrace, pathops
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.ttLib import TTFont
import seg

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, '..', 'source')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'fonts')
os.makedirs(OUT, exist_ok=True)

STD = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "0123456789"]
FAMILIES = {
    'Miri Block': dict(
        img='miri-block-specimen.webp', x0=245, sb=0.055, space=0.30, weights=[
            ('Thin', 100, [[284, 322], [337, 381], [389, 435], [442, 487], [498, 534]], STD),
            ('Regular', 400, [[592, 633], [646, 692], [698, 746], [750, 797], [807, 845]], STD),
            ('Bold', 700, [[899, 943], [957, 1004], [1009, 1059], [1061, 1109], [1118, 1158]], STD),
            ('ExtraBold', 800, [[1212, 1257], [1269, 1318], [1322, 1371], [1373, 1420], [1428, 1469]], STD),
        ]),
    'Miri Script': dict(
        img='miri-script-specimen.webp', x0=255, sb=0.02, slant=0.3, space=0.26, weights=[
            ('Thin', 100, [[240, 305], [305, 370], [370, 430], [430, 490], [490, 560]], STD),
            ('Regular', 400, [[570, 640], [640, 705], [705, 765], [765, 825], [825, 900]], STD),
            ('Bold', 700, [[900, 975], [975, 1040], [1040, 1105], [1105, 1165], [1165, 1240]], STD),
            ('ExtraBold', 800, [[1250, 1315], [1315, 1375], [1375, 1432], [1432, 1491]],
             STD[:3] + ["nopqrstuvwxyz0123456789"]),
        ], match_width={'ExtraBold': {3: 'Bold'}}),
}
CAP = 700
XLET = set("acemnorsuvwxz")
U = 8  # upscale factor before tracing


def cls(ch):
    return 'cap' if ch.isupper() else 'lc' if ch.islower() else 'fig'


def extract(a, lab, glyphs):
    """Return per-character dict: soft ink crop, pixel offset, bbox."""
    res = {}
    for ch, g in glyphs.items():
        pad = 3
        ry0, ry1 = max(g['y0'] - pad, 0), g['y1'] + pad
        rx0, rx1 = g['x0'] - pad, g['x1'] + pad
        m = np.isin(lab[ry0:ry1, rx0:rx1], g['ids'])
        m = ndi.binary_dilation(m, iterations=2)
        if g.get('split'):  # merged neighbours: keep only this glyph's columns
            m[:, :pad] = False
            m[:, -pad:] = False
        ink = (255 - a[ry0:ry1, rx0:rx1].astype(float)) / 255 * m
        ys, xs = np.nonzero(ink > 0.5)
        res[ch] = dict(ink=ink, rx=rx0, ry=ry0, bx0=rx0 + xs.min(), bx1=rx0 + xs.max() + 1,
                       by0=ry0 + ys.min(), by1=ry0 + ys.max() + 1, ids=g['ids'])
    return res


def upscale(ink):
    big = cv2.resize(ink, (ink.shape[1] * U, ink.shape[0] * U), interpolation=cv2.INTER_CUBIC)
    return big > 0.5


def stroke_px(ink):
    """Typical stroke thickness in upscaled pixels."""
    big = upscale(ink)
    dt = ndi.distance_transform_edt(big)
    return 2 * float(np.median(dt[skeletonize(big)]))


def trace(ink, grow=0):
    big = upscale(ink)
    if grow > 0:  # embolden: grow the shape by `grow` upscaled pixels
        big = ndi.distance_transform_edt(~big) <= grow
    bm = potrace.Bitmap(~big)
    return bm.trace(turdsize=U * U * 2, alphamax=1.0, opticurve=True, opttolerance=0.3)


def to_path(curves, tf):
    p = pathops.Path()
    pen = p.getPen()
    for c in curves:
        pen.moveTo(tf(c.start_point))
        for s in c.segments:
            if s.is_corner:
                pen.lineTo(tf(s.c))
                pen.lineTo(tf(s.end_point))
            else:
                pen.curveTo(tf(s.c1), tf(s.c2), tf(s.end_point))
        pen.closePath()
    p.fillType = pathops.FillType.EVEN_ODD
    return pathops.simplify(p, fix_winding=True, clockwise=False)


def measure(info, rows):
    """Baseline per row and pixel height per glyph class."""
    base, rowh, heights = {}, {}, {'cap': [], 'lc': [], 'fig': []}
    for r, chars in enumerate(rows):
        for kind in ('cap', 'lc', 'fig'):
            ref = [c for c in chars if cls(c) == kind and (kind != 'lc' or c in XLET) and c not in 'JQ']
            if not ref:
                continue
            base[(r, kind)] = st.median(info[c]['by1'] for c in ref)
            hs = [info[c]['by1'] - info[c]['by0'] for c in ref]
            rowh[(r, kind)] = st.median(hs)
            heights[kind] += hs
    return base, rowh, {k: st.median(v) for k, v in heights.items()}


def build_family(fam, cfg):
    img = os.path.join(IMG, cfg['img'])
    targets = None
    widths = {}  # weight -> char -> slant-corrected width in font units
    strokes = {}  # weight -> char -> stroke thickness in font units
    weights = sorted(cfg['weights'], key=lambda w: w[0] != 'Regular')  # Regular first sets proportions
    for wname, wclass, bands, rows in weights:
        a, lab, out = seg.segment(img, cfg['x0'], bands)
        out = seg.fix_counts(a, out, [len(r) for r in rows], bands)
        glyphs = {}
        for chars, groups in zip(rows, out):
            assert len(chars) == len(groups), (fam, wname, chars, len(groups))
            glyphs.update(zip(chars, groups))
        info = extract(a, lab, glyphs)
        base, rowh, hpx = measure(info, rows)
        if targets is None:
            r = CAP / hpx['cap']
            targets = {'cap': CAP, 'lc': round(hpx['lc'] * r), 'fig': round(hpx['fig'] * r)}
        # Scale each row separately so every row lands on the family's cap/x/figure height.
        scale = {rk: targets[rk[1]] / h for rk, h in rowh.items()}
        row_of = {c: r for r, chars in enumerate(rows) for c in chars}
        k_slant = cfg.get('slant', 0)

        def dbounds(g, b):
            ys, xs = np.nonzero(g['ink'] > 0.5)
            xd = g['rx'] + xs - (b - (g['ry'] + ys)) * k_slant
            return xd.min(), xd.max() + 1

        # Rows squeezed in the specimen get stretched back to a reference weight's widths.
        stretch, grow = {}, {}
        for r, ref in cfg.get('match_width', {}).get(wname, {}).items():
            # How much heavier this weight is than the reference, judged on the capitals.
            caps = [c for c in info if cls(c) == 'cap']
            heavier = (st.median(stroke_px(info[c]['ink']) / U * scale[(row_of[c], 'cap')] for c in caps)
                       / st.median(strokes[ref][c] for c in caps))
            for kind in {cls(c) for c in rows[r]}:
                ratios = []
                for c in rows[r]:
                    if cls(c) == kind:
                        l, rr = dbounds(info[c], base[(r, kind)])
                        ratios.append(widths[ref][c] / ((rr - l) * scale[(r, kind)]))
                stretch[(r, kind)] = st.median(ratios)
                cur = st.median(stroke_px(info[c]['ink']) / U * scale[(r, kind)] for c in rows[r] if cls(c) == kind)
                ref_sw = heavier * st.median(strokes[ref][c] for c in rows[r] if cls(c) == kind)
                grow[(r, kind)] = max(0.0, (ref_sw - cur) / 2 / scale[(r, kind)] * U)
        widths[wname] = {}
        strokes[wname] = {}

        charstrings, metrics, cmap = {}, {}, {}
        order = ['.notdef', 'space']
        ymin, ymax = 0, CAP
        sb = round(cfg['sb'] * 1000)

        def emit(name, path, adv):
            nonlocal ymin, ymax
            pen = T2CharStringPen(adv, None)
            path.draw(pen)
            charstrings[name] = pen.getCharString()
            if path.bounds:
                xmin, y0, _, y1 = path.bounds
                ymin, ymax = min(ymin, y0), max(ymax, y1)
                metrics[name] = (adv, round(xmin))
            else:
                metrics[name] = (adv, 0)

        for ch, g in info.items():
            k = cls(ch)
            s = scale[(row_of[ch], k)]
            b = base[(row_of[ch], k)]
            # Space glyphs on slant-corrected bounds so italic overhangs don't open gaps.
            left, right = dbounds(g, b)
            sx = s * stretch.get((row_of[ch], k), 1.0)
            widths[wname][ch] = (right - left) * sx
            if 'match_width' in cfg:
                strokes[wname][ch] = stroke_px(g['ink']) / U * s
            tf = lambda pt, g=g, s=s, sx=sx, b=b, left=left: (
                round((g['rx'] + pt.x / U - left) * sx + sb, 1),
                round((b - (g['ry'] + pt.y / U)) * s, 1))
            path = to_path(trace(g['ink'], grow.get((row_of[ch], k), 0)), tf)
            adv = round((right - left) * sx + 2 * sb)
            name = ch if ch.isalpha() else ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
                                            'seven', 'eight', 'nine'][int(ch)]
            emit(name, path, adv)
            order.append(name)
            cmap[ord(ch)] = name

        # Period and colon reuse the dot of the lowercase i.
        gi = info['i']
        dot_id = min(gi['ids'], key=lambda i: ndi.find_objects((lab == i).astype(int))[0][0].start)
        ys, xs = ndi.find_objects((lab == dot_id).astype(int))[0]
        s, b = scale[(row_of['i'], 'lc')], base[(row_of['i'], 'lc')]
        h, w = gi['ink'].shape
        dmask = ndi.binary_dilation(np.isin(lab[gi['ry']:gi['ry'] + h, gi['rx']:gi['rx'] + w], [dot_id]), iterations=2)
        dcurves = trace(gi['ink'] * dmask)
        xh_px = targets['lc'] / s
        on_base = b - ys.stop            # dot bottom on the baseline
        on_xh = (b - xh_px) - ys.start   # dot top at the x-height
        for name, uni, shifts in (('period', 0x2E, [on_base]), ('colon', 0x3A, [on_base, on_xh])):
            p = pathops.Path()
            for shift in shifts:
                tf = lambda pt, shift=shift: (
                    round((gi['rx'] + pt.x / U - xs.start) * s + 2 * sb, 1),
                    round((b - (gi['ry'] + pt.y / U + shift)) * s, 1))
                p = pathops.op(p, to_path(dcurves, tf), pathops.PathOp.UNION)
            emit(name, p, round((xs.stop - xs.start) * s + 4 * sb))
            order.append(name)
            cmap[uni] = name

        space = round(cfg['space'] * 1000)
        emit('space', pathops.Path(), space)
        cmap[0x20] = 'space'
        nd = pathops.Path(); pen = nd.getPen()
        for rect in ([(50, 0), (450, 0), (450, CAP), (50, CAP)], [(100, 50), (100, CAP - 50), (400, CAP - 50), (400, 50)]):
            pen.moveTo(rect[0]); [pen.lineTo(q) for q in rect[1:]]; pen.closePath()
        emit('.notdef', nd, 500)

        asc, desc = round(max(ymax, CAP) + 20), round(min(ymin, -200) - 20)
        famname = fam
        ps = fam.replace(' ', '') + '-' + wname
        fb = FontBuilder(1000, isTTF=False)
        fb.setupGlyphOrder(order)
        fb.setupCharacterMap(cmap)
        fb.setupCFF(ps, {'FullName': f'{fam} {wname}', 'FamilyName': fam, 'Weight': wname}, charstrings, {})
        fb.setupHorizontalMetrics(metrics)
        fb.setupHorizontalHeader(ascent=asc, descent=desc)
        style = 'Regular' if wname in ('Regular', 'Bold') else wname
        fb.setupNameTable({
            'familyName': fam if wname in ('Regular', 'Bold') else f'{fam} {wname}',
            'styleName': style if wname != 'Bold' else 'Bold',
            'typographicFamily': fam, 'typographicSubfamily': wname,
            'uniqueFontIdentifier': ps, 'fullName': f'{fam} {wname}', 'psName': ps,
            'version': 'Version 1.000', 'copyright': 'Miri Deutsch branding',
        })
        fb.setupOS2(version=4, usWeightClass=wclass, sTypoAscender=asc, sTypoDescender=desc, sTypoLineGap=0,
                    usWinAscent=asc, usWinDescent=-desc, sxHeight=targets['lc'], sCapHeight=CAP,
                    fsSelection=(1 << 5 if wname == 'Bold' else 0) | (1 << 6 if wname == 'Regular' else 0) | (1 << 7),
                    achVendID='MIRI')
        fb.setupPost()
        fb.font['head'].macStyle = 1 if wname == 'Bold' else 0
        otf = os.path.join(OUT, ps + '.otf')
        fb.save(otf)
        f = TTFont(otf); f.flavor = 'woff2'; f.save(os.path.join(OUT, ps + '.woff2'))
        print('built', ps, 'glyphs', len(order), 'asc/desc', asc, desc, targets)


if __name__ == '__main__':
    for fam, cfg in FAMILIES.items():
        build_family(fam, cfg)
