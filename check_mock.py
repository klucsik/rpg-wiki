#!/usr/bin/env python3
import sys

content = open("scripts/import/google-docs/verify-implementation.test.ts").read()
lines = content.split("\n")
pDepth = 0; bDepth = 0

for i, line in enumerate(lines):
    pOpen = line.count("("); pClose = line.count(")")
    bOpen = line.count("{"); bClose = line.count("}")
    pDepth += pOpen - pClose
    bDepth += bOpen - bClose
    print(f"L{i+1:2d}: ({pOpen}-{pClose})={pDepth:+3d}  {{ {bOpen}-{bClose} }}={bDepth:+3d} | {line[:75]}")

print(f"\nFinal: parens={pDepth}, braces={bDepth}")
sys.exit(1 if pDepth != 0 or bDepth != 0 else 0)
