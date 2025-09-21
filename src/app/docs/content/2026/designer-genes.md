## Overview
Advanced genetics and biotechnology: molecular mechanisms, gene regulation, genomics, population genetics, and lab methods interpretation.

## Core Topics
- Molecular genetics: DNA replication (enzymes, directionality), repair (MMR/BER/NER basics)
- Transcription and regulation: promoters, enhancers, silencers, transcription factors; prokaryotic operons (lac/trp)
- RNA processing: capping, splicing (introns/exons), poly(A); alternative splicing
- Translation: ribosome, tRNA, codons; wobble; post‑translational modifications (concepts)
- Gene regulation in eukaryotes: chromatin (acetylation/methylation), epigenetics, non‑coding RNAs (miRNA/siRNA)
- Biotechnology methods: PCR/qPCR, RT‑PCR, cloning, restriction enzymes/ligase, plasmids/vectors, Sanger sequencing, gel electrophoresis, blotting (S/N/W), CRISPR‑Cas basics
- Population genetics: allele/genotype frequencies, Hardy–Weinberg assumptions, simple calculations and deviations

## Skills
- Interpret gels, blots, and qPCR curves
- Predict effects of mutations (nonsense, missense, frameshift, splice‑site)
- Design primers conceptually; reason about restriction maps
- Apply Hardy–Weinberg to compute carrier frequencies and expected counts

## Molecular Techniques (quick reference)
- PCR: denaturation → annealing → extension; primers flank target; product length = distance between primers
- qPCR: amplification curves; Ct earlier → higher starting template; ΔΔCt for relative expression (conceptual)
- RT‑PCR: reverse transcription of RNA → cDNA prior to PCR
- Restriction analysis: cut sites produce predictable fragment sizes; loss/gain of a site alters band pattern
- Cloning: insert into vector with compatible ends; selection markers and screens (e.g., blue/white)
- Sanger sequencing: chain‑terminating ddNTPs; read from electropherogram (5'→3') of newly synthesized strand
- Blots: Southern (DNA), Northern (RNA), Western (protein) — probe/antibody specificity
- CRISPR‑Cas9: guide RNA targets sequence; Cas9 creates DSB; NHEJ causes indels, HDR can introduce precise edits (if template present)

## Gene Regulation Highlights
- Prokaryotes (lac): lactose present → allolactose inactivates repressor; glucose low → ↑cAMP–CAP enhances transcription
- Eukaryotes: open chromatin (euchromatin) favors transcription; histone acetylation opens chromatin; DNA methylation often represses
- Alternative splicing yields multiple isoforms from one gene; miRNAs guide RISC to repress translation/trigger mRNA decay

## Problem Types and Strategies
- Gel reading: sum fragment sizes to original; heterozygotes show both fragments; ladder alignment for approximate sizes
- Mutation reasoning: frameshifts downstream of indels not multiple of 3; splice‑site mutations can cause intron retention/exon skipping
- Operon logic: predict β‑galactosidase/permease levels under combinations of lactose/glucose and operator/promoter mutations
- qPCR ΔΔCt (concept): ΔCt = Ct(target) − Ct(ref); ΔΔCt = ΔCt(treated) − ΔCt(control); relative expression ≈ 2^(−ΔΔCt)

## Population Genetics
- Hardy–Weinberg: p + q = 1; p² + 2pq + q² = 1
- Given recessive disease frequency q², compute q = √q², p = 1 − q; carrier frequency ≈ 2pq
- Deviations: selection, non‑random mating, migration, drift, mutation; recognize when assumptions break

## Worked Examples
1) Restriction digest: loss of an EcoRI site converts bands 700+300 bp → single 1000 bp band; heterozygote shows 1000, 700, and 300 bp
2) qPCR: Ct_control=22, Ct_treated=24 for target; ref gene Ct both 18 → ΔCt_control=4, ΔCt_treated=6 → ΔΔCt=2 → expression ≈ 2^(−2)=0.25×
3) Operon: lacI− (no functional repressor) with lactose absent, glucose present → high basal transcription from constitutive expression is still limited without CAP activation (qualitative)
4) HWE: disease incidence 1/10,000 → q²=0.0001 → q=0.01, p=0.99 → carrier ≈ 2pq ≈ 0.0198 (≈1.98%)

## Pitfalls
- Confusing template vs coding strand and 5'/3' orientation
- Misreading heterozygote banding patterns
- Treating ΔΔCt as linear instead of exponential
- Ignoring reading frame/splice signals when predicting mutation effects

## Study Roadmap
1) Build technique one‑pagers (purpose, inputs, outputs, typical readouts)
2) Drill gel/blot/qPCR interpretation problems
3) Practice operon/regulation logic and mutation consequences
4) Work HW genetics problems (probability, HWE) under time

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Designer_Genes
- OpenStax Biology; NCBI primers on PCR/sequencing basics
