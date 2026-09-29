"""Reproduce the public benchmark. No patient data or clinical calls.
Usage: python analyze.py /path/to/cran-qpcR
Requires numpy, pandas, pyreadr. Data: qpcR competimer, GPL >=2.
"""
from pathlib import Path
import csv, hashlib, json, sys
import numpy as np
import pyreadr

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1]) / 'data/competimer.rda'
df = pyreadr.read_r(str(SOURCE))['competimer']
assert df.shape == (45, 148) and df.isna().sum().sum() == 0
cycles = df['Cycles'].tolist()
letters = 'ABCDEFG'
inhibitors = [0, 5, 10, 20, 30, 40, 50]
levels = [64, 16, 4, 1, .25, .0625, None]
wells = []
for col in df.columns[1:]:
    a, b, rep = col.split('_')
    raw = df[col].to_numpy()
    baseline = float(np.median(raw[:3]))
    wells.append(dict(id=col, inhibitor=inhibitors[letters.index(a)],
                      level=levels[letters.index(b)], group=f'{a}_{b}',
                      replicate=int(rep), baseline=baseline,
                      signal=[round(float(x-baseline), 7) for x in raw]))

def crossing(signal, threshold=1.):
    for i in range(1, len(signal)):
        if signal[i-1] < threshold <= signal[i]:
            return cycles[i-1] + (threshold-signal[i-1]) / (signal[i]-signal[i-1])
    return None

def summarize(threshold=1., max_shift=2., max_spread=.5, min_margin=5.):
    cq = {w['id']:crossing(w['signal'],threshold) for w in wells}
    rows=[]
    for a in letters:
        ntc=[cq[w['id']] for w in wells if w['group']==f'{a}_G' and cq[w['id']] is not None]
        for b in letters[:6]:
            ids=[w['id'] for w in wells if w['group']==f'{a}_{b}']
            vals=[cq[i] for i in ids if cq[i] is not None]
            refs=[cq[w['id']] for w in wells if w['group']==f'A_{b}' and cq[w['id']] is not None]
            median=float(np.median(vals)) if vals else None
            shift=median-float(np.median(refs)) if vals and len(refs)==3 else None
            spread=max(vals)-min(vals) if vals else None
            margin=min(ntc)-max(vals) if ntc and vals else None
            reasons=[]
            if len(vals)!=3: reasons.append('incomplete crossing')
            if shift is None: reasons.append('reference incomplete')
            elif abs(shift)>max_shift: reasons.append('reference shift')
            if spread is not None and spread>max_spread: reasons.append('replicate spread')
            if margin is not None and margin<min_margin: reasons.append('NTC proximity')
            rows.append(dict(group=f'{a}_{b}', inhibitor=inhibitors[letters.index(a)], level=levels[letters.index(b)],
                             detected=len(vals), median=median,shift=shift,spread=spread,ntc_margin=margin,reasons=reasons))
    return rows,cq

rows,cq=summarize()
results={'conditions':len(rows),'curves':len(wells),'ntc_curves':21,
         'flagged':sum(bool(r['reasons']) for r in rows),
         'ntc_crossings':sum(cq[w['id']] is not None for w in wells if w['level'] is None),
         'default':next(r for r in rows if r['group']=='D_D'),'rows':rows,
         'threshold_sensitivity':[{"threshold":t,"flagged":sum(bool(r['reasons']) for r in summarize(t)[0])} for t in [.5,1.,1.5,2.]]}
data={'commit':'0ad07f2036db03add33a475964522f357a4ab8df','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
      'cycles':cycles,'inhibitors':inhibitors,'levels':levels,'wells':wells}
(ROOT/'data.js').write_text('window.NUMEN_DATA = '+json.dumps(data,separators=(',',':'),allow_nan=False)+';\n')
(ROOT/'checks.json').write_text(json.dumps(results,indent=2,allow_nan=False)+'\n')
with (ROOT/'source-curves.csv').open('w',newline='') as f:
    writer=csv.writer(f); writer.writerow(['curve_id','inhibitor_percent','series_level','cycle','raw_fluorescence','baseline_corrected_fluorescence'])
    for w in wells:
        for i,c in enumerate(cycles): writer.writerow([w['id'],w['inhibitor'],'NTC' if w['level'] is None else w['level'],c,df[w['id']].iloc[i],w['signal'][i]])
print(json.dumps({k:v for k,v in results.items() if k!='rows'},indent=2))
