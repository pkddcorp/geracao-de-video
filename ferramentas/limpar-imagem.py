"""Ferramentas de imagem para o estúdio.
Requer: pip install pillow numpy scipy

  python ferramentas/limpar-imagem.py logo   entrada.png saida.png   # remove fundo claro em volta de um logo (ex: print de post)
  python ferramentas/limpar-imagem.py cor    entrada.png saida.png "#e01e2d"   # mantém só uma cor (ex: logo vermelho em fundo quadriculado falso)
"""
import sys
from PIL import Image, ImageFilter
import numpy as np

def logo(ent, sai):
    from scipy import ndimage
    im = Image.open(ent).convert('RGB')
    im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)
    a = np.asarray(im).astype(float)
    claro = (a.mean(2) > 178) & ((a.max(2) - a.min(2)) < 55)
    rot, _ = ndimage.label(claro)
    borda = set(np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))) - {0}
    fundo = np.isin(rot, list(borda))
    alfa = Image.fromarray(np.where(fundo, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
    out = im.convert('RGBA'); out.putalpha(alfa); out = out.crop(out.getbbox()); out.save(sai)

def cor(ent, sai, hexcor):
    r0, g0, b0 = int(hexcor[1:3], 16), int(hexcor[3:5], 16), int(hexcor[5:7], 16)
    a = np.asarray(Image.open(ent).convert('RGB')).astype(float)
    dist = np.sqrt(((a - [r0, g0, b0]) ** 2).sum(2))
    alfa = np.clip((140 - dist) / 80, 0, 1)
    out = np.zeros((*a.shape[:2], 4)); out[..., 0], out[..., 1], out[..., 2], out[..., 3] = r0, g0, b0, alfa * 255
    o = Image.fromarray(out.astype(np.uint8), 'RGBA'); o = o.crop(o.getbbox())
    o.resize((o.width * 3, o.height * 3), Image.LANCZOS).save(sai)

if __name__ == '__main__':
    m = sys.argv[1]
    if m == 'logo': logo(sys.argv[2], sys.argv[3])
    elif m == 'cor': cor(sys.argv[2], sys.argv[3], sys.argv[4])
    else: print(__doc__)
