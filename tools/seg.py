import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
UP="ABCDEFGHIJKLM NOPQRSTUVWXYZ abcdefghijklm nopqrstuvwxyz 0123456789".split()
def segment(img, x0, bands, thr=128):
    a=np.asarray(Image.open(img).convert('L'))
    dark=a<thr
    dark[:, :x0]=False; dark[:bands[0][0]]=False; dark[bands[-1][1]:]=False
    lab,n=ndi.label(dark)
    objs=ndi.find_objects(lab)
    rows=[[] for _ in bands]
    for i,sl in enumerate(objs):
        ys,xs=sl
        area=(lab[sl]==i+1).sum()
        if area<4: continue
        cy=ndi.center_of_mass(lab[sl]==i+1)[0]+ys.start
        for r,(b0,b1) in enumerate(bands):
            if b0<=cy<b1: rows[r].append(dict(id=i+1,x0=xs.start,x1=xs.stop,y0=ys.start,y1=ys.stop,area=int(area)))
    out=[]
    for comps in rows:
        comps.sort(key=lambda c:c['x0'])
        groups=[]
        for c in comps:
            if groups:
                g=groups[-1]
                ov=min(g['x1'],c['x1'])-max(g['x0'],c['x0'])
                w=min(g['x1']-g['x0'],c['x1']-c['x0'])
                if ov>0.5*w:
                    g['ids'].append(c['id']);g['x0']=min(g['x0'],c['x0']);g['x1']=max(g['x1'],c['x1'])
                    g['y0']=min(g['y0'],c['y0']);g['y1']=max(g['y1'],c['y1']);continue
            groups.append(dict(ids=[c['id']],x0=c['x0'],x1=c['x1'],y0=c['y0'],y1=c['y1']))
        out.append(groups)
    return a,lab,out
if __name__=='__main__':
    img=sys.argv[1]; x0=int(sys.argv[2]); bands=json.loads(sys.argv[3])
    a,lab,out=segment(img,x0,bands)
    for r,g in enumerate(out): print(r,len(g),[ (x['x0'],x['x1']) for x in g])

def fix_counts(a, out, expected, bands, thr=128):
    """Split merged groups at the column with least ink until counts match."""
    dark=a<thr
    for r,(groups,n) in enumerate(zip(out,expected)):
        while len(groups)<n:
            gi=max(range(len(groups)),key=lambda i:groups[i]['x1']-groups[i]['x0'])
            g=groups[gi]
            b0,b1=bands[r]
            col=dark[b0:b1,g['x0']:g['x1']].sum(0)
            w=len(col); lo,hi=int(w*0.25),int(w*0.75)
            cut=g['x0']+lo+int(np.argmin(col[lo:hi]))
            g1=dict(g,x1=cut,split=True); g2=dict(g,x0=cut,split=True)
            groups[gi:gi+1]=[g1,g2]
    return out
