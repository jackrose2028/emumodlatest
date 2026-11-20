# "Sprite Lab": a small NES program for the classroom (public domain, CC0).
#  D-pad moves a 16x16 character made of 4 sprites. A row of 10 balls shares one line, so the NES (8 sprites per
#  line) hides two: A switches flicker on/off (the trick games used). B starts/stops scrolling across two screens.
#  Select changes the character's palette. Start puts everything back. A, B and Select also play the pulse,
#  triangle and noise channels.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asm6502 import assemble

# ---------- graphics (2 bits per pixel; 0 = transparent / backdrop) ----------
def tile(rows):
    p0 = bytearray(); p1 = bytearray()
    for r in rows:
        a = b = 0
        for c in r:
            v = int(c); a = (a << 1) | (v & 1); b = (b << 1) | (v >> 1)
        p0.append(a); p1.append(b)
    return bytes(p0 + p1)

T = {}
T[0] = ["00000000"] * 8
T[1] = ["11111111"] * 8
T[2] = ["00333300", "03111130", "31122113", "31121113", "31111113", "31111113", "03111130", "00333300"]   # ball
T[3] = ["11121111", "11121111", "22222222", "11111211", "11111211", "22222222", "11121111", "11121111"]   # brick
T[4] = ["33333333", "33333333", "13313313", "11111111", "11121111", "22222222", "11111211", "11111211"]   # grass
T[5] = ["00000033", "00003333", "00333333", "03333333", "33333333", "33333333", "13333333", "01111111"]   # cloud left
T[6] = ["33000000", "33330000", "33333300", "33333330", "33333333", "33333333", "33333331", "11111110"]   # cloud right
T[7] = ["22222222", "21111112", "21133112", "21311312", "21113112", "21131112", "21111112", "22222222"]   # block
# 16x16 character: a little robot
robot = ["0000033333300000",
         "0000311111130000",
         "0003111111113000",
         "0031122112211300",
         "0031133113311300",
         "0031111111111300",
         "0003112222113000",
         "0000311111130000",
         "0033333333333300",
         "0311122222211130",
         "3111122222211113",
         "3113122222213113",
         "0333122222213330",
         "0000311001130000",
         "0003111001113000",
         "0003333003333000"]
T[8] = [r[:8] for r in robot[:8]]; T[9] = [r[8:] for r in robot[:8]]
T[10] = [r[:8] for r in robot[8:]]; T[11] = [r[8:] for r in robot[8:]]
chr_rom = bytearray(0x2000)
for i, rows in T.items():
    chr_rom[i * 16:i * 16 + 16] = tile(rows)

# ---------- background rows (tile numbers) ----------
SKY = [0] * 32
def row_with(pairs, base=None):
    r = list(base or SKY)
    for x, t in pairs: r[x] = t
    return r
ROWS = {
    'sky': SKY,
    'cloudA': row_with([(4, 5), (5, 6), (20, 5), (21, 6)]),
    'cloudB': row_with([(10, 5), (11, 6), (26, 5), (27, 6)]),
    'cloudC': row_with([(13, 5), (14, 6)]),
    'blocks0': row_with([(8, 7), (9, 7), (10, 7), (24, 7)]),
    'blocks1': row_with([(4, 7), (14, 7), (15, 7), (16, 7), (28, 7)]),
    'grass': [4] * 32,
    'brick': [3] * 32,
}
names = list(ROWS)
def table(cloud1, cloud2, blocks):
    t = []
    for r in range(30):
        if r == 4: t.append(cloud1)
        elif r == 8: t.append(cloud2)
        elif r == 16: t.append(blocks)
        elif r == 22: t.append('grass')
        elif r > 22: t.append('brick')
        else: t.append('sky')
    return [names.index(x) for x in t]
NT0 = table('cloudA', 'cloudC', 'blocks0')
NT1 = table('cloudB', 'sky', 'blocks1')
ATTR = [0x00] * 32 + [0x0A] * 8 + [0x50] * 8 + [0x55] * 16
PAL = [0x21, 0x11, 0x21, 0x30,  0x21, 0x17, 0x07, 0x2A,  0x21, 0x27, 0x17, 0x38,  0x21, 0x0F, 0x00, 0x10,
       0x21, 0x16, 0x27, 0x0F,  0x21, 0x1A, 0x2A, 0x30,  0x21, 0x12, 0x22, 0x30,  0x21, 0x14, 0x24, 0x38]

def bytes_line(vals): return ".byte " + ",".join("$%02X" % v for v in vals)

src = """
ptr = $00
rowi = $02
buttons = $10
prev = $11
pressed = $12
px = $13
py = $14
flicker = $15
scrollon = $16
scrollx = $17
ntbit = $18
palsel = $19
frame = $1A
nmiflag = $1C
ctrl = $1D
OAM = $0200

reset: SEI
 CLD
 LDX #$40
 STX $4017
 LDX #$FF
 TXS
 INX
 STX $2000
 STX $2001
 STX $4010
vb1: BIT $2002
 BPL vb1
 LDA #$00
clr: STA $0000,X
 STA $0100,X
 STA $0300,X
 STA $0400,X
 STA $0500,X
 STA $0600,X
 STA $0700,X
 INX
 BNE clr
 LDA #$FF
hide: STA OAM,X
 INX
 BNE hide
vb2: BIT $2002
 BPL vb2
; palettes
 LDA $2002
 LDA #$3F
 STA $2006
 LDA #$00
 STA $2006
 LDX #$00
pal: LDA palettes,X
 STA $2007
 INX
 CPX #32
 BNE pal
; nametable 0 at $2000
 LDA $2002
 LDA #$20
 STA $2006
 LDA #$00
 STA $2006
 LDA #$00
 STA rowi
r0: LDY rowi
 LDA nt0,Y
 TAX
 LDA rowlo,X
 STA ptr
 LDA rowhi,X
 STA ptr+1
 LDY #$00
c0: LDA (ptr),Y
 STA $2007
 INY
 CPY #32
 BNE c0
 INC rowi
 LDA rowi
 CMP #30
 BNE r0
 LDX #$00
a0: LDA attrs,X
 STA $2007
 INX
 CPX #64
 BNE a0
; nametable 1 at $2400
 LDA #$24
 STA $2006
 LDA #$00
 STA $2006
 LDA #$00
 STA rowi
r1: LDY rowi
 LDA nt1,Y
 TAX
 LDA rowlo,X
 STA ptr
 LDA rowhi,X
 STA ptr+1
 LDY #$00
c1: LDA (ptr),Y
 STA $2007
 INY
 CPY #32
 BNE c1
 INC rowi
 LDA rowi
 CMP #30
 BNE r1
 LDX #$00
a1: LDA attrs,X
 STA $2007
 INX
 CPX #64
 BNE a1
; sound on, start values
 LDA #$0F
 STA $4015
 JSR startpos
 LDA #%10000000
 STA ctrl
 STA $2000
 LDA #%00011110
 STA $2001

main: LDA nmiflag
 BEQ main
 LDA #$00
 STA nmiflag
; read controller 1: bit7 A, 6 B, 5 Select, 4 Start, 3 Up, 2 Down, 1 Left, 0 Right
 LDA #$01
 STA $4016
 LDA #$00
 STA $4016
 LDX #$08
rd: LDA $4016
 LSR A
 ROL buttons
 DEX
 BNE rd
 LDA prev
 EOR #$FF
 AND buttons
 STA pressed
 LDA buttons
 STA prev
; move
 LDA buttons
 AND #$01
 BEQ nor
 INC px
nor: LDA buttons
 AND #$02
 BEQ nol
 DEC px
nol: LDA buttons
 AND #$04
 BEQ nod
 INC py
nod: LDA buttons
 AND #$08
 BEQ nou
 DEC py
nou:
; A: flicker on/off + pulse beep
 LDA pressed
 AND #$80
 BEQ noa
 LDA flicker
 EOR #$01
 STA flicker
 LDA #$5F
 STA $4000
 LDA #$00
 STA $4001
 LDA #$FD
 STA $4002
 LDA #$20
 STA $4003
noa:
; B: scrolling on/off + triangle note
 LDA pressed
 AND #$40
 BEQ nob
 LDA scrollon
 EOR #$01
 STA scrollon
 LDA #$7F
 STA $4008
 LDA #$D4
 STA $400A
 LDA #$20
 STA $400B
nob:
; Select: next palette + noise hit
 LDA pressed
 AND #$20
 BEQ nosel
 INC palsel
 LDA palsel
 AND #$03
 STA palsel
 LDA #$1F
 STA $400C
 LDA #$05
 STA $400E
 LDA #$00
 STA $400F
nosel:
; Start: back to the beginning
 LDA pressed
 AND #$10
 BEQ nost
 JSR startpos
nost:
; scrolling across both screens
 LDA scrollon
 BEQ noscr
 INC scrollx
 BNE noscr
 LDA ntbit
 EOR #$01
 STA ntbit
noscr:
; character: 4 sprites in OAM slots 0-3
 LDA py
 STA OAM+0
 STA OAM+4
 CLC
 ADC #$08
 STA OAM+8
 STA OAM+12
 LDA #$08
 STA OAM+1
 LDA #$09
 STA OAM+5
 LDA #$0A
 STA OAM+9
 LDA #$0B
 STA OAM+13
 LDA palsel
 STA OAM+2
 STA OAM+6
 STA OAM+10
 STA OAM+14
 LDA px
 STA OAM+3
 STA OAM+11
 CLC
 ADC #$08
 STA OAM+7
 STA OAM+15
; ten balls on one line, slots 4-13; with flicker the order flips every frame
 LDX #$10
 LDY #$00
 LDA flicker
 BEQ fwd
 LDA frame
 AND #$01
 BEQ fwd
 LDY #$09
bwd: LDA #60
 STA OAM,X
 LDA #$02
 STA OAM+1,X
 TYA
 AND #$03
 STA OAM+2,X
 LDA ballx,Y
 STA OAM+3,X
 TXA
 CLC
 ADC #$04
 TAX
 DEY
 BPL bwd
 JMP main
fwd: LDA #60
 STA OAM,X
 LDA #$02
 STA OAM+1,X
 TYA
 AND #$03
 STA OAM+2,X
 LDA ballx,Y
 STA OAM+3,X
 TXA
 CLC
 ADC #$04
 TAX
 INY
 CPY #10
 BNE fwd
 JMP main

startpos: LDA #120
 STA px
 LDA #150
 STA py
 LDA #$00
 STA scrollx
 STA ntbit
 STA flicker
 STA scrollon
 RTS

nmi: PHA
 TXA
 PHA
 TYA
 PHA
 LDA #$00
 STA $2003
 LDA #$02
 STA $4014
 LDA $2002
 LDA scrollx
 STA $2005
 LDA #$00
 STA $2005
 LDA ctrl
 ORA ntbit
 STA $2000
 INC frame
 LDA #$01
 STA nmiflag
 PLA
 TAY
 PLA
 TAX
 PLA
irq: RTI

palettes: """ + bytes_line(PAL) + """
attrs: """ + bytes_line(ATTR) + """
nt0: """ + bytes_line(NT0) + """
nt1: """ + bytes_line(NT1) + """
ballx: """ + bytes_line([16 + i * 22 for i in range(10)]) + """
rowlo: .byte """ + ",".join("<row_" + n for n in names) + """
rowhi: .byte """ + ",".join(">row_" + n for n in names) + "\n" + "\n".join("row_%s: %s" % (n, bytes_line(ROWS[n])) for n in names) + "\n"

code, syms = assemble(src, 0xC000)
assert len(code) < 0x3FFA, len(code)
prg = bytearray([0xFF] * 0x4000)
prg[:len(code)] = code
for addr, label in ((0x3FFA, 'nmi'), (0x3FFC, 'reset'), (0x3FFE, 'irq')):
    v = syms[label]; prg[addr] = v & 0xFF; prg[addr + 1] = v >> 8
header = bytes([0x4E, 0x45, 0x53, 0x1A, 1, 1, 0x01, 0]) + bytes(8)   # NROM-128, 8 KB CHR, vertical mirroring
out = sys.argv[1] if len(sys.argv) > 1 else "sprite-lab.nes"
open(out, "wb").write(header + bytes(prg) + bytes(chr_rom))
print(len(code), "bytes of code and data ->", out)
