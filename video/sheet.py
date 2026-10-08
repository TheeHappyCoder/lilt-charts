import sys
from PIL import Image, ImageDraw
names=[int(n) for n in sys.argv[2].split(',')]
cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
size=int(sys.argv[4]) if len(sys.argv)>4 else 400
rows=(len(names)+cols-1)//cols
sheet=Image.new('RGB',(size*cols,size*rows),'white')
d=ImageDraw.Draw(sheet)
for i,n in enumerate(names):
    im=Image.open(f'frames/still-{n}.png').convert('RGB').resize((size,size))
    x,y=(i%cols)*size,(i//cols)*size
    sheet.paste(im,(x,y)); d.text((x+6,y+4),str(n),fill='yellow')
sheet.save(sys.argv[1])
