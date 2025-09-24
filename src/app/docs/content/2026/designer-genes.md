## Overview
Designer Genes is a written event covering classical, molecular, and evolutionary genetics. Tests emphasize quantitative reasoning, interpretation of experimental data, and clear, evidence‑based conclusions. This article synthesizes the 2026 scope into a concise study reference with worked examples and common pitfalls.

## Syllabus (structured guide)
### 1) Mendelian genetics
- Laws and extensions: segregation; independent assortment; violations (linkage, incomplete/ codominance, complementation).
- Punnett squares: mono‑, di‑, and trihybrid crosses; probability trees; conditional probability.
- Pedigrees: dominant vs recessive; autosomal vs sex‑linked; mitochondrial inheritance cues.
- Epistasis: 9:3:3:1 baseline modified to 9:7, 12:3:1, 9:3:4, 15:1, etc. by gene interactions.
- Linkage and mapping: recombination frequency (RF) as an estimate of map distance (cM); two‑point and (States/Nationals) three‑point mapping with double‑crossover detection.

### 2) Mitosis and meiosis
- Cell division stages and structures: mitosis vs meiosis I/II; synapsis and crossing over.
- Nondisjunction: aneuploidy patterns and karyotype interpretation (trisomy/monosomy; meiotic stage inferences).
- (States/Nationals) Somatic recombination context: immune cell V(D)J and class switching (qualitative).

### 3) Population and evolutionary genetics
- Hardy–Weinberg equilibrium (HWE): assumptions; p + q = 1; p² + 2pq + q² = 1.
- Deviations and forces: genetic drift, bottlenecks, founder effects; migration; selection via relative fitness.
- Quantitative traits: additive alleles and continuous variation; rough gene‑number estimation from phenotypic classes.
- Gene duplication and homology: homologs; orthologs vs paralogs; role in innovation.
- Phylogenetics: reading trees, rooting, monophyly/paraphyly; basics of tree building from sequences (alignment → model → inference) at a conceptual level.
- (States/Nationals) Heritability: H² (broad‑sense), h² (narrow‑sense), realized heritability.

### 4) Molecular biology of DNA
- Structure: nucleotide components; antiparallel strands; base pairing.
- Replication: pre‑replication complex; origin firing; leading/lagging strands; Okazaki fragments; termination.
- Fidelity: polymerase selection/ proofreading; mismatch repair.
- Organization: plasmids; chromatin (euchromatin vs heterochromatin); chromosomes.
- Damage and repair: UV (pyrimidine dimers), oxidation, double‑strand breaks; BER/NER/MMR (scope‑appropriate).
- Mutations: chromosomal rearrangements, insertions/deletions, substitutions; protein‑level consequences (silent, missense, nonsense, frameshift).

### 5) Prokaryotic gene expression and regulation
- Central dogma and reverse transcription (conceptual).
- Transcription: initiation → elongation → termination; RNA polymerase function.
- Regulatory logic: cis vs trans elements; promoters, operators, enhancers/silencers (conceptual), riboswitches; lac and trp operons (induction vs repression).
- Translation: ribosome, tRNA, codons; initiation → elongation → termination; regulation overview.
- (States/Nationals) Protein secretion systems: Sec and Tat (qualitative roles and differences).

### 6) Technology and techniques
- PCR: steps, required components, temperature cycle logic; what questions PCR can answer.
- Sanger sequencing: ddNTPs; how it differs from PCR; read electropherograms.
- Next‑gen vs third‑gen: Illumina vs Nanopore (high‑level platforms, typical outputs, trade‑offs).
- Molecular cloning: restriction enzymes, ligase or Gibson assembly; vectors; selection/blue‑white screening; expression considerations.
- Knockout/knockdown: functional genomics logic; when to prefer each; (States/Nationals) techniques: RNAi, homologous recombination, CRISPR/TALENs (purpose and limits).
- (States/Nationals) ChIP‑seq, Hi‑C, RNA‑seq: what each measures, canonical outputs, and basic limitations.

## Worked examples
1) Epistasis ratio recognition
- Observation: dihybrid cross yields ~9:7 (presence of either recessive allele at either locus eliminates pigment).
- Interpretation: complementary gene action; both dominant alleles needed for full phenotype.

2) Two‑point mapping from testcross data
- Data: 18 recombinants among 200 progeny → RF ≈ 9 cM.
- Caution: RF underestimates larger distances due to multiple crossovers.

3) Three‑point mapping (States/Nationals concept)
- Identify parental and double‑crossover (DCO) classes; gene order is the allele that flips in DCOs. Compute distances with DCOs counted twice.

4) Nondisjunction inference
- Karyotype shows trisomy; if all gametes show aneuploidy for multiple chromosomes, suspect meiosis I error; if sister chromatids fail to separate, meiosis II.

5) HWE carrier frequency
- Disease incidence q² = 1/10,000 → q = 0.01; p = 0.99; carriers 2pq ≈ 0.0198 (~1.98%).

6) Operon logic
- lac operon: lactose present (allolactose inactivates repressor); low glucose (↑cAMP–CAP) → maximal transcription. Mutations in operator/promoter have predictable phenotypes.

7) Gel/sequence interpretation
- Loss of a restriction site converts two fragments (700 + 300 bp) to one (1000 bp); heterozygotes show all three bands. Sanger: call sequence from the smallest band (5′→3′ of the newly synthesized strand).

## Common pitfalls and exam cues
- Mixing coding vs template strand orientation; writing the wrong mRNA direction.
- Treating ΔΔCt (qPCR) as linear instead of exponential (expression ≈ 2^(−ΔΔCt)).
- Ignoring frameshift effects on downstream codons.
- Misclassifying epistasis patterns; forgetting that 9:3:3:1 is the comparison baseline.
- Over‑interpreting RF > ~20–25 cM without considering double crossovers.

## Rapid reference
- HWE: p + q = 1; p² + 2pq + q² = 1.
- Map distance (approx.): RF% ≈ cM (small distances).
- Operon outcomes: repressor off + CAP on → high expression; repressor off + CAP off → moderate; repressor on → low.
- Mutation effects: nonsense → premature stop; missense → amino‑acid change (effect varies); frameshift → altered reading frame downstream.

## Practice prompts
- Classify inheritance from a three‑generation pedigree with skipped generations and male predominance.
- Compute two‑point map distance from progeny counts; discuss biases.
- Interpret a Sanger trace with overlapping peaks (heterozygous site) and infer genotype.
- Given ΔCt values, compute relative expression (ΔΔCt) and interpret regulation.
- Outline a cloning strategy for expressing a gene in bacteria: vector choice, restriction sites or Gibson, selection marker, screening.

## Further reading
- SciOly Wiki: https://scioly.org/wiki/index.php/Designer_Genes
- OpenStax Biology (Genetics units); NCBI primers on PCR and sequencing
