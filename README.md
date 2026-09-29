# Assay signals worth a second look

An exploratory qPCR review tool prepared by Cathy Liu for Numen's Research Associate II role.

**Live:** https://liuzhitong330.github.io/numen-assay-qc-demo/

147 measured amplification curves; 42 sample conditions plus 21 matched no-template curves. Select a condition, change review criteria, inspect every replicate and export all 42 conditions with source identifiers and current settings. No raw curve is excluded.

## Data and interpretation

Ruijter et al., *Methods* 59 (2013), 32–46. DOI [10.1016/j.ymeth.2012.08.011](https://doi.org/10.1016/j.ymeth.2012.08.011). Dataset `competimer`, distributed in [qpcR 1.4-2](https://cran.r-project.org/package=qpcR). Source repository: https://github.com/cran/qpcR at **0ad07f2036db03add33a475964522f357a4ab8df**. License GPL >=2. Attribution remains with the source authors. The source file SHA256 is embedded in data.js. No relevant Numen-owned public code/data was verified; this is an external assay benchmark, not Numen's proprietary platform.

Seven competitive-primer percentages (0, 5, 10, 20, 30, 40, 50), six nominal template-series levels (64,16,4,1,0.25,0.0625), and three technical replicates per condition/NTC. Human AluSx repeats, SYBR Green, LightCycler 480. The series labels are retained from the source, not reported as absolute concentrations.

Subtract per-curve median of cycles1–3; linearly interpolate first upward threshold crossing. Compare each detected median to the complete matched0% reference. Incomplete triplicates remain visible with provisional medians. NTC separation = earliest detected NTC minus latest detected sample; no detected NTC yields a right-censored lower bound. Missing sample/reference crossings, absolute shift>2cycles, replicate range>0.5cycles, or NTC separation<5cycles trigger manual review by default. These thresholds are exploratory, not clinical or assay-release specifications.

Default derived checks: **28/42** conditions flagged, **18/21** NTC curves cross by45cycles. Condition D_D (20%, level1): **2/3** cross; provisional median shift **3.836402cycles**; range **0.150530cycles**. Changing fluorescence threshold0.5→1.0→1.5→2.0 changes flagged counts25→28→33→34. This is analytical sensitivity, not observed failure prevalence.

Early amplification may contaminate baseline estimation at high input. NTC signal cannot distinguish primer-dimer/nonspecific products from contamination without specificity evidence. No clinical sensitivity/specificity, assay validation or biological replication is established. The tool was built with coding assistance; it does not establish independent bench or coding competence.

## Reproduce

```sh
git clone https://github.com/cran/qpcR.git qpcr-source
git -C qpcr-source checkout 0ad07f2036db03add33a475964522f357a4ab8df
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python analyze.py qpcr-source
.venv/bin/python verify.py
python -m http.server 8000
```

`analyze.py` parses the measured R dataset with pyreadr and calculates checks independently in Python. It does not run qpcR model-fitting algorithms. Browser calculations in app.js are a separate implementation. `verify.py` recomputes raw-CSV crossings using the standard library and checks all42 conditions and threshold-sensitivity totals. `source-curves.csv` contains raw and baseline-corrected fluorescence; `checks.json` contains default results. Static site; no backend, credentials, analytics or patient uploads.

## Scope

The working contribution is a control-aware review and reproducible evidence export. It maps to assay analysis, recognition of suspect experiments, clear records and scientific communication. It demonstrates analytical reasoning, not physical qPCR execution, human-specimen certification, ELISA validation or an endorsed Numen acceptance policy.

Code and derived data in this repository are provided under GPL-3.0-or-later, consistent with the source package's GPL >=2 license. Original benchmark attribution is preserved above.
