# A small two-pass 6502 assembler for the classroom homebrew (public domain, CC0).
# Syntax: "label:", "NAME = $10", "LDA #$21", "STA $0200,X", "LDA (ptr),Y", "BNE label", ".byte 1,$02,name",
# ".word label", ".org $C000", comments after ";". Numbers: $hex, %binary, decimal. "<label"/">label" = low/high byte.
import re

OPS = {
 'LDA': {'imm':0xA9,'zp':0xA5,'zpx':0xB5,'abs':0xAD,'absx':0xBD,'absy':0xB9,'indy':0xB1},
 'LDX': {'imm':0xA2,'zp':0xA6,'abs':0xAE,'absy':0xBE,'zpy':0xB6},
 'LDY': {'imm':0xA0,'zp':0xA4,'abs':0xAC,'absx':0xBC,'zpx':0xB4},
 'STA': {'zp':0x85,'zpx':0x95,'abs':0x8D,'absx':0x9D,'absy':0x99,'indy':0x91},
 'STX': {'zp':0x86,'abs':0x8E}, 'STY': {'zp':0x84,'abs':0x8C,'zpx':0x94},
 'INC': {'zp':0xE6,'abs':0xEE,'zpx':0xF6,'absx':0xFE}, 'DEC': {'zp':0xC6,'abs':0xCE,'zpx':0xD6,'absx':0xDE},
 'CMP': {'imm':0xC9,'zp':0xC5,'abs':0xCD,'absx':0xDD,'zpx':0xD5}, 'CPX': {'imm':0xE0,'zp':0xE4}, 'CPY': {'imm':0xC0,'zp':0xC4},
 'AND': {'imm':0x29,'zp':0x25,'absx':0x3D}, 'ORA': {'imm':0x09,'zp':0x05,'absx':0x1D}, 'EOR': {'imm':0x49,'zp':0x45},
 'ADC': {'imm':0x69,'zp':0x65,'absx':0x7D}, 'SBC': {'imm':0xE9,'zp':0xE5},
 'BIT': {'zp':0x24,'abs':0x2C}, 'JMP': {'abs':0x4C}, 'JSR': {'abs':0x20},
 'LSR': {'acc':0x4A,'zp':0x46}, 'ASL': {'acc':0x0A,'zp':0x06}, 'ROL': {'acc':0x2A,'zp':0x26}, 'ROR': {'acc':0x6A,'zp':0x66},
}
IMPLIED = {'CLC':0x18,'SEC':0x38,'CLI':0x58,'SEI':0x78,'CLD':0xD8,'CLV':0xB8,'INX':0xE8,'INY':0xC8,'DEX':0xCA,'DEY':0x88,
 'TAX':0xAA,'TXA':0x8A,'TAY':0xA8,'TYA':0x98,'TXS':0x9A,'TSX':0xBA,'PHA':0x48,'PLA':0x68,'PHP':0x08,'PLP':0x28,
 'RTS':0x60,'RTI':0x40,'NOP':0xEA}
BRANCH = {'BPL':0x10,'BMI':0x30,'BVC':0x50,'BVS':0x70,'BCC':0x90,'BCS':0xB0,'BNE':0xD0,'BEQ':0xF0}

def assemble(src, org=0xC000):
    lines = [l.split(';')[0].rstrip() for l in src.splitlines()]
    syms = {}
    for p in (1, 2):
        pc = org; out = bytearray()
        def val(expr):
            expr = expr.strip()
            m = re.fullmatch(r'([<>]?)(.+?)([+-]\d+)?', expr)
            sel, body, off = m.group(1), m.group(2).strip(), m.group(3)
            if body.startswith('$'): v = int(body[1:], 16)
            elif body.startswith('%'): v = int(body[1:], 2)
            elif body.isdigit(): v = int(body)
            elif body in syms: v = syms[body]
            elif p == 1: v = 0xFFFF
            else: raise ValueError('unknown symbol ' + body)
            if off: v += int(off)
            if sel == '<': v &= 0xFF
            if sel == '>': v = (v >> 8) & 0xFF
            return v
        for raw in lines:
            line = raw.strip()
            if not line: continue
            m = re.fullmatch(r'(\w+)\s*=\s*(.+)', line)
            if m: syms[m.group(1)] = val(m.group(2)); continue
            m = re.match(r'(\w+):\s*(.*)', line)
            if m:
                syms[m.group(1)] = pc; line = m.group(2).strip()
                if not line: continue
            parts = line.split(None, 1)
            mn = parts[0].upper(); arg = parts[1].strip() if len(parts) > 1 else ''
            if mn == '.ORG': pc = val(arg); continue
            if mn == '.BYTE':
                for a in arg.split(','): out.append(val(a) & 0xFF); pc += 1
                continue
            if mn == '.WORD':
                for a in arg.split(','): v = val(a); out += bytes([v & 0xFF, v >> 8]); pc += 2
                continue
            if mn in IMPLIED: out.append(IMPLIED[mn]); pc += 1; continue
            if mn in BRANCH:
                t = val(arg); off = t - (pc + 2)
                if p == 2 and not -128 <= off <= 127: raise ValueError('branch too far: ' + line)
                out += bytes([BRANCH[mn], off & 0xFF]); pc += 2; continue
            modes = OPS[mn]
            if arg in ('', 'A'): out.append(modes['acc']); pc += 1; continue
            if arg.startswith('#'): out += bytes([modes['imm'], val(arg[1:]) & 0xFF]); pc += 2; continue
            m = re.fullmatch(r'\((.+)\),\s*Y', arg, re.I)
            if m: out += bytes([modes['indy'], val(m.group(1)) & 0xFF]); pc += 2; continue
            idx = ''
            m = re.fullmatch(r'(.+),\s*([XY])', arg, re.I)
            if m: arg, idx = m.group(1), m.group(2).lower()
            v = val(arg)
            zp = 'zp' + idx; ab = 'abs' + idx
            if v < 0x100 and zp in modes:
                out += bytes([modes[zp], v]); pc += 2
            else:
                out += bytes([modes[ab], v & 0xFF, v >> 8]); pc += 3
    return bytes(out), syms

