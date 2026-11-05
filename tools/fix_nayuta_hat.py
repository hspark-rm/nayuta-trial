# 나유타 초상: 배경 지우기 때 함께 지워진 삿갓 윗면을 주변 삿갓 색으로 채운다
import sys, glob
from PIL import Image, ImageDraw
import numpy as np
S, SAVE = sys.argv[1], len(sys.argv) > 2
def hull(pts):
    pts=sorted(set(pts))
    def cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lo=[];up=[]
    for p in pts:
        while len(lo)>=2 and cross(lo[-2],lo[-1],p)<=0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up)>=2 and cross(up[-2],up[-1],p)<=0: up.pop()
        up.append(p)
    return lo[:-1]+up[:-1]
tiles=[]
for f in sorted(glob.glob('assets/portraits/nayuta_*.png')):
    im=np.array(Image.open(f).convert('RGBA')).astype(int); H,W=im.shape[:2]
    r,g,b,a=im[...,0],im[...,1],im[...,2],im[...,3]
    lum=(r*3+g*6+b)/10
    hat=(a>=128)&(r>140)&(r-b>50)&(g>100); hat[300:]=False
    ys,xs=np.nonzero(hat)
    mask=Image.new('L',(W,H),0); ImageDraw.Draw(mask).polygon(hull(list(zip(xs.tolist(),ys.tolist()))),fill=255)
    inh=np.array(mask)>0
    # 지워진 구멍에서 시작해, 삿갓 색이 아닌 밝은 잔여 픽셀(흰 배경 찌꺼기)까지 이어서 넓힌다. 검은 테두리에서 멈춘다
    pink=(g<0.83*r)&(b>0.6*r)
    cand=inh&(lum>120)&(~hat|pink)
    # 그림 위쪽 끝에 닿은 투명 덩어리(꼭대기 구멍)만 씨앗으로 쓴다. 챙 아래 양 끝은 원래 배경이다
    from collections import deque
    tr=inh&(a<128); hole=np.zeros_like(tr)
    q0=deque((0,x) for x in np.nonzero(tr[0])[0])
    for y,x in q0: hole[y,x]=True
    while q0:
        y,x=q0.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<H and 0<=nx<W and tr[ny,nx] and not hole[ny,nx]: hole[ny,nx]=True; q0.append((ny,nx))
    q=deque((y,x,0) for y,x in zip(*np.nonzero(hole)))
    while q:
        y,x,dd=q.popleft()
        if dd>=6: continue
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<H and 0<=nx<W and cand[ny,nx] and not hole[ny,nx]: hole[ny,nx]=True; q.append((ny,nx,dd+1))
    # 밝은 삿갓 면의 대표색 하나로 평평하게 채운다(도트 그림의 면 처리)
    src=hat&~pink&(lum>150)&(a>=250)
    col=np.median(im[src][:,:3],axis=0)
    o=im.copy(); o[hole,:3]=col; o[hole,3]=255
    o=Image.fromarray(o.astype(np.uint8))
    o.save(f if SAVE else S+'/fix_'+f.split('/')[-1])
    bg=Image.new('RGBA',(W,H),(255,0,255,255)); tiles.append(Image.alpha_composite(bg,o).crop((150,0,720,220)))
    print(f, int(hole.sum()))
sheet=Image.new('RGBA',(570,880))
for i,t in enumerate(tiles): sheet.paste(t,(0,220*i))
sheet.save(S+'/hat_fix_sheet3.png')
