# Disease Detectives (2026)

Divisions: B, C  
Type: Study  
Participants: 2–3  
Approx. Time: 50 minutes  
Allowed Materials: Typically reference notesheet/binder and Class I calculator (confirm current manual)

> Community-maintained. Update with current CDC frameworks and rule clarifications.

## Overview
Applied epidemiology: outbreak investigations, surveillance, study designs, measures of disease frequency and association, screening, bias/confounding, and interpretation of public health data. Emphasis on data tables, epi curves, case definitions, and concise reasoning.

## Core Topics
- Outbreak Investigation: 10 steps, case definition, line list, epi curve, control measures
- Measures: incidence, prevalence, attack rates, risk vs. rate vs. odds; OR, RR, AR, PAR
- Screening: sensitivity, specificity, predictive values; test accuracy vs. prevalence; ROC intuition
- Bias, Confounding, Effect modification; random error and precision
- Study Designs: descriptive, cross-sectional, cohort, case-control, RCTs; when to use which
- Surveillance: passive/active/sentinel; notifiable diseases; syndromic surveillance
- Infectious Disease Dynamics: R0, Re, serial interval, incubation period, herd immunity threshold
- Data Skills: 2×2 tables, stratification, Simpson’s paradox, interpreting graphs/maps

## Key Definitions
- Case: individual meeting the case definition (confirmed/probable/suspected).
- Exposure: suspected risk factor preceding disease.
- Outcome: disease or health state of interest.
- Population at risk: individuals susceptible and under observation.
- Incubation period: time from exposure to symptom onset.
- Infectious period: time when a case can transmit the pathogen.

## Measures and Core Calculations
- Risk (cumulative incidence) = cases / population-at-risk over specified period
- Incidence rate = new cases / person-time at risk
- Prevalence = existing cases / population (point or period)
- Odds = p / (1 − p)
- Attack rate (AR) = cases among exposed / total exposed (often outbreak meals/venues)
- Secondary attack rate = new cases among contacts / susceptible contacts
- Risk Ratio (RR) = [a/(a+b)] / [c/(c+d)]
- Odds Ratio (OR) = (a·d) / (b·c) (commonly in case–control)
- Attributable Risk (AR difference) = Risk_exposed − Risk_unexposed
- AR Ratio (Etiologic fraction) = (Risk_exposed − Risk_unexposed) / Risk_exposed
- Population Attributable Risk (PAR) = Risk_population − Risk_unexposed
- PAR% = (Risk_pop − Risk_unexp) / Risk_pop × 100

2×2 Table (exposure vs. disease):

|               | Disease + | Disease − | Total |
|---------------|-----------|-----------|-------|
| Exposed       | a         | b         | a+b   |
| Unexposed     | c         | d         | c+d   |
| Total         | a+c       | b+d       | N     |

Screening metrics:
- Sensitivity = TP / (TP + FN); Specificity = TN / (TN + FP)
- PPV = TP / (TP + FP); NPV = TN / (TN + FN)
- As prevalence ↑, PPV ↑ and NPV ↓ (holding test characteristics fixed)

## Outbreak Investigation: 10 Steps
1) Prepare for field work (confirm diagnosis, gather supplies, liaise)
2) Establish the existence of an outbreak (observe vs. expected)
3) Verify diagnosis (clinical, lab, rule out artifacts)
4) Define and identify cases (case definition; confirmed/probable/suspected)
5) Describe and orient data by person, place, time (line list; epi curve; spot maps)
6) Develop hypotheses (source, transmission, risk factors)
7) Evaluate hypotheses (analytic studies, e.g., case–control/cohort in outbreaks)
8) Implement control and prevention measures (don’t wait to finish analysis)
9) Communicate findings (briefs, stakeholders, press as needed)
10) Maintain surveillance and evaluate effectiveness of interventions

Line list essentials: ID, onset date/time, demographics, exposures, outcomes; supports epi curve and stratified analysis.

Epi curve patterns: point source (sharp rise and fall), continuous common source (plateaued), propagated (successive waves).

## Study Designs and When to Use
- Descriptive: person–place–time summaries; hypothesis generation.
- Cross-sectional: prevalence snapshot; association not temporality.
- Cohort: start with exposure; compute risks/RR/AR; prospective or retrospective.
- Case–control: start with outcome; sample controls; compute OR; efficient for rare diseases/long latency.
- RCTs: randomization; control confounding; ethical/feasibility constraints (rare in outbreak response).

Confounding vs. effect modification:
- Confounder: associated with exposure and outcome, not on causal path; distorts association. Control by randomization, restriction, matching, stratification.
- Effect modification (interaction): true difference in effect across strata; report stratum-specific estimates.

Bias types:
- Selection bias (non-representative sampling), information/misclassification bias (recall, interviewer, measurement), surveillance bias.

Stratification and Simpson’s paradox: combined association reverses when analyzing within strata—always check key strata (e.g., age, sex, site) and use Mantel–Haenszel OR conceptually when needed.

## Screening and Public Health Programs
- Purposes: early detection, reduce morbidity/mortality when treatment effective.
- Tradeoffs: sensitivity vs. specificity; false positives vs. false negatives depend on cutoffs.
- Parallel vs. serial testing: parallel increases sensitivity; serial increases specificity.
- Lead-time and length biases: can inflate apparent survival benefits without real mortality reduction.

## Surveillance Systems
- Passive (routine reporting), active (field outreach), sentinel (selected sites), syndromic (symptom-based, near-real-time).
- Notifiable conditions: report per jurisdiction; timeliness, completeness matter.
- Use surveillance to detect aberrations, trigger investigations, and evaluate interventions.

## Infectious Disease Dynamics
- Basic reproduction number R0: expected secondary cases in fully susceptible population.
- Effective reproduction number Re: R0 × S (fraction susceptible) with interventions/immunity.
- Herd immunity threshold (HIT) ≈ 1 − 1/R0; Vaccine effectiveness (VE) ≈ 1 − RR among vaccinated vs. unvaccinated (for disease outcomes).
- Serial interval vs. incubation period: serial is case-to-case onset gap; incubation is exposure-to-onset.

## Strategy
- Build a compact formula sheet; include unit checks and typical denominators.
- Practice rapid 2×2, attack rate, and screening computations; annotate tables.
- Interpret epi curves and spot maps; write 1–2 sentence conclusions with caveats.

## Practice Prompts
1) Construct a case definition and classify 10 sample patients from a line list (confirmed/probable/suspected).
2) Meal cohort: compute attack rates by item, AR difference/ratio, and identify the likely vehicle.
3) Case–control: compute OR and interpret; check for confounding by age via stratified ORs.
4) Screening: given sensitivity/specificity and prevalence, compute PPV/NPV and discuss tradeoffs.
5) Epi curve: identify exposure pattern (point, continuous, propagated) and estimate likely exposure window.

## Advanced topics and deep dives

### Stratification, confounding, and effect modification (worked)
- Suppose crude OR = 2.0 for smoking→MI. Stratify by age: OR_young = 1.1, OR_old = 3.6, with very different smoking prevalence. The crude OR may be confounded by age. Report stratum-specific ORs if effect modification suspected; otherwise provide an adjusted estimate (Mantel–Haenszel) and justify.

### Mantel–Haenszel OR (conceptual)
- For K strata: OR_MH ≈ Σ (a_k·d_k / n_k) / Σ (b_k·c_k / n_k). Use provided tables only if event scope includes it; otherwise, reason qualitatively that stratification changed the association.

### Cochran–Mantel–Haenszel (CMH) test (stratified 2×2×K)
- Purpose: test the null of no common association between exposure and disease across K strata (e.g., age groups), controlling for stratification.
- Inputs per stratum k: 2×2 counts a_k, b_k, c_k, d_k; n_k = a_k+b_k+c_k+d_k.
- Expected count of a_k under H0: E[a_k] = ((a_k+b_k)(a_k+c_k)) / n_k.
- Variance: Var(a_k) = ((a_k+b_k)(c_k+d_k)(a_k+c_k)(b_k+d_k)) / (n_k^2 (n_k−1)).
- CMH statistic (with continuity correction 0.5 when appropriate):
  X_CM H^2 = (|Σ (a_k − E[a_k])| − 0.5)^2 / Σ Var(a_k).
- Decision: compare X_CM H^2 to χ^2 with 1 d.f. (or use p-value). If small cells (<5), Fisher’s exact or exact CMH may be preferred; state limitation if applicable.
- Interpretation: If significant and stratum-specific effects are similar (no strong interaction), conclude an overall association controlling for strata. If effects differ greatly, report effect modification, not a pooled effect.

Confidence intervals (if in scope): compute OR_MH, then use a provided variance formula for ln(OR_MH) to form 95% CI = exp( ln(OR_MH) ± 1.96·SE ). If variance not provided, state qualitative strength and consistency across strata.

### Fisher’s exact (2×2) and small cells
- Use Fisher’s exact when any expected cell < 5 (common in case–control with rare outcomes). Report exact p-value if provided, or state that small counts limit chi-square validity.

### Confidence intervals for OR and RR (log method)
- For OR = (a·d)/(b·c): SE[ln(OR)] ≈ √(1/a + 1/b + 1/c + 1/d); 95% CI = exp( ln(OR) ± 1.96·SE ).
- For RR = [a/(a+b)] / [c/(c+d)]: SE[ln(RR)] ≈ √( b/(a(a+b)) + d/(c(c+d)) ); 95% CI analogously.

### Bayes theorem and ROC (screening depth)
- Bayes: PPV = (Se·Prev) / (Se·Prev + (1−Sp)·(1−Prev)); NPV = (Sp·(1−Prev)) / ((1−Se)·Prev + Sp·(1−Prev)).
- ROC curve: tradeoff of Se vs 1−Sp as cutoff varies; AUC summarizes discriminative ability. For competition, describe qualitatively unless data are provided.

### Vaccine effectiveness (VE)
- Cohort: VE ≈ 1 − RR (risk among vaccinated / risk among unvaccinated).
- Case–control: VE ≈ 1 − OR (odds of vaccination among cases vs controls).
- Example (cohort): attack rate vaccinated 5/200 = 0.025; unvaccinated 20/200 = 0.10 → RR=0.25; VE≈75%.

### Worked CMH numeric example
Two age strata:

Stratum Young (n1=60):
- Exposed: cases a1=18, non-cases b1=12
- Unexposed: cases c1=10, non-cases d1=20
OR1 = (18·20)/(12·10) = 360/120 = 3.0

Stratum Old (n2=100):
- Exposed: a2=22, b2=18
- Unexposed: c2=25, d2=35
OR2 = (22·35)/(18·25) = 770/450 ≈ 1.71

Pooled OR_MH ≈ Σ(a_k d_k/n_k) / Σ(b_k c_k/n_k) = (18·20/60 + 22·35/100) / (12·10/60 + 18·25/100) = (6 + 7.7) / (2 + 4.5) = 13.7/6.5 ≈ 2.11.

CMH test:
- E[a1] = ((a1+b1)(a1+c1))/n1 = (30·28)/60 = 14; Var(a1) ≈ ((30·30·28·32)/(60^2·59)) ≈ 3.80.
- E[a2] = (40·47)/100 = 18.8; Var(a2) ≈ ((40·60·47·53)/(100^2·99)) ≈ 6.04.
- Σ(a_k − E[a_k]) = (18−14) + (22−18.8) = 7.2; ΣVar ≈ 9.84.
- With 0.5 continuity correction: X^2 ≈ (|7.2|−0.5)^2 / 9.84 = 6.7^2 / 9.84 ≈ 4.56 → p≈0.03 (df=1) → significant pooled association controlling for age.

Heterogeneity note: OR1 (3.0) vs OR2 (1.71) differ but not dramatically; if strata ORs were very different or opposite, report effect modification instead of pooling.

### Interpreting epi curves
- Point source: sharp rise and fall; narrow incubation distribution. Continuous: plateaued cases; exposures persist. Propagated: successive peaks ~1 incubation apart; consider person-to-person spread.
- Estimating exposure window: earliest case onset − minimum incubation to latest case onset − maximum incubation.

### Bias catalog (examples and mitigations)
- Selection: volunteer bias, loss to follow-up → ensure comparable follow-up, use intention-to-treat where applicable.
- Information: recall bias (case–control), interviewer bias → blinding, standardized questionnaires.
- Misclassification: nondifferential tends to bias toward the null; differential can bias either way → validate measures.
- Surveillance: increased case finding in exposed group → harmonize ascertainment across groups.

### Screening caveats
- Lead-time bias: earlier diagnosis inflates survival time without real mortality benefit.
- Length bias: screening overrepresents slow-progressing disease.
- Overdiagnosis: detection of indolent disease → weigh harms from false positives/over-treatment.

### Infectious disease metrics
- Generation time vs. serial interval: generation time (infection→infection) unobserved; serial interval (onset→onset) observable proxy.
- Interventions lower Re below 1 to halt spread; interpret HIT with caution in heterogenous mixing.

### Reporting templates
- One-paragraph abstract (background, methods, results with key metrics, recommendation). Bullet list of immediate controls (remove source, hygiene, isolation) and longer-term steps (policy, vaccination, surveillance changes).

## Case study (end-to-end)
- A wedding outbreak: 240 attendees; line list constructed. Symptoms: onset peaked 10–12 h post-dinner; recovery within 24–36 h → suggests toxin-mediated illness. Meal cohort shows highest AR for “cream-filled pastries”: AR_e=0.62 (n=58), AR_u=0.08 (n=182). RR≈7.8 (95% CI calculation optional if scope allows). Control: discard leftovers, notify caterer, inspect kitchen, advise attendees. Lab: test for Staph aureus enterotoxin. Communicate with local health department; issue recommendations.

## Study checklist (self-audit)
- Definitions memorized; formula sheet prepared; blank 2×2 and line list templates ready
- Practice with epi curves and meal cohort problems; screening PPV/NPV with varying prevalence
- Short-answer structures memorized (design choice, bias identification, confounding control)

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Disease_Detectives
- CDC Principles of Epidemiology: https://www.cdc.gov/csels/dsepd/ss1978/index.html
- CDC Field Epidemiology Manual (selected chapters)
