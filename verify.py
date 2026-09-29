"""Independent standard-library recomputation from raw source CSV."""
import csv, json, math, statistics
from pathlib import Path
root=Path(__file__).resolve().parent
curves={}
with (root/'source-curves.csv').open() as f:
    for r in csv.DictReader(f): curves.setdefault(r['curve_id'],[]).append(float(r['raw_fluorescence']))
assert len(curves)==147 and all(len(v)==45 for v in curves.values())
checks=json.loads((root/'checks.json').read_text())
for t,expected in [(0.5,25),(1,28),(1.5,33),(2,34)]:
    times={}
    for key,raw in curves.items():
        base=statistics.median(raw[:3]); y=[round(v-base,7) for v in raw]
        points=[(i+(t-y[i-1])/(y[i]-y[i-1])) for i in range(1,45) if y[i-1]<t<=y[i]]
        times[key]=points[0] if points else None
    flagged=0
    for row in checks['rows']:
        a,b=row['group'].split('_')
        samples=[times[f'{a}_{b}_{r}'] for r in range(1,4) if times[f'{a}_{b}_{r}'] is not None]
        refs=[times[f'A_{b}_{r}'] for r in range(1,4) if times[f'A_{b}_{r}'] is not None]
        controls=[times[f'{a}_G_{r}'] for r in range(1,4) if times[f'{a}_G_{r}'] is not None]
        median=statistics.median(samples) if samples else None
        shift=median-statistics.median(refs) if samples and len(refs)==3 else None
        spread=max(samples)-min(samples) if samples else None
        margin=min(controls)-max(samples) if controls and samples else None
        flag=len(samples)!=3 or shift is None or abs(shift)>2 or (spread is not None and spread>.5) or (margin is not None and margin<5)
        flagged+=bool(flag)
        if t==1:
            for name,value in [('median',median),('shift',shift),('spread',spread),('ntc_margin',margin)]:
                assert value is None and row[name] is None or value is not None and math.isclose(value,row[name],abs_tol=1e-9),(row['group'],name)
            assert len(samples)==row['detected'] and bool(flag)==bool(row['reasons'])
    assert flagged==expected,(t,flagged)
assert times['D_D_2'] is None
print('PASS: 147 curves; all 42 condition values; four threshold counts; retained non-crossing replicate.')
