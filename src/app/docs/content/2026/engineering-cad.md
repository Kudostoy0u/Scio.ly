## Overview
Engineering CAD is fundamentally about translating drawings and design intent into robust models that edit gracefully. Model efficiently by constraining sketches completely, choosing features that reflect how parts function, and organizing assemblies with the fewest necessary mates. Treat drawings as communication artifacts: pick views and dimensions that tell a clear manufacturing story.

## Modeling fundamentals
A well‑behaved model starts with disciplined sketches. Keep profiles simple and fully constrained with dimensions and relations, then build geometry through a logical feature sequence—base extrudes or revolves first, followed by cuts and secondary details, with fillets and chamfers added late to reduce rebuild issues. Patterns and mirrors exist to encode repetition and symmetry with minimal effort; tie them to reference planes and axes so edits propagate predictably. Design intent means that when a key dimension changes (such as an overall width), the right faces move and holes stay centered without manual clean‑up.

## Reading drawings
Engineering drawings convey geometry, material, and critical tolerances. Read orthographic and section views together to reconstruct shape before measuring, then use dimensions to check your mental model. Diameter and radius symbols, callouts, and notes often encode implicit constraints that should become sketch relations. If mass or center of mass is requested, confirm that material properties and units match the title block; a consistent setup prevents chasing unit‑conversion errors later.

## Common features and assemblies
Extrudes and revolves cover the majority of prismatic and turned parts; sweeps and lofts handle transitions and path‑dependent profiles when simple features cannot. Shells and drafts should be applied early if the part is molded or cast so that later details inherit the correct taper. In assemblies, fix one base component and use concentric and planar mates sparingly to constrain degrees of freedom; over‑constraining leads to conflicts and rebuild failures. Subassemblies simplify repeated mechanisms and reduce mate counts, and interference checks quickly reveal clearance issues long before drawing creation.

## Drawings and documentation
Good drawings present the minimum set of views at legible scales, adding sections or details only where hidden features matter. Dimension to functional datums rather than chaining long sequences, and reserve geometric tolerancing for features that truly require datum‑based control. Annotations, materials, and units belong in consistent title blocks; a readable drawing often prevents the very mistakes competitions are designed to tease out.

## Strategy and time management
Before touching the mouse, scan the drawing and sketch a quick plan: which feature comes first, where symmetry exists, and which patterns to use. Build with templates for planes, units, and title blocks to save setup time. Verify key dimensions as you go so late surprises do not cascade through the model. In teams, divide parts by independence and mate complexity so that integration is smooth.

## Worked micro‑examples
- Revolved boss with patterned holes: revolve a half‑profile about a centerline, then cut a single hole and circular‑pattern it around the axis.
- Lofted transition: sketch inlet and outlet profiles on parallel planes and guide the loft with a curve to prevent twisting, enforcing tangent conditions where needed.
- Assembly alignment: fix a base plate, apply concentric mates to seat bearings on shafts, then planar‑mate faces to the plate; add orientation only if rotation must be locked.

## Pitfalls
Under‑ or over‑constrained sketches cause rebuild errors; early fillets break downstream edge references; patterns tied to faces instead of datums drift under edits; and unit mismatches invalidate mass calculations. Each failure mode is avoided by constraining deliberately, delaying cosmetic features, anchoring patterns to reference geometry, and checking units at import.

## Practice prompts
- Recreate a stepped bracket from a drawing with section and detail views, then report mass and CoM after assigning the specified alloy.
- Model a keyed shaft and assemble it with two bearings and a pulley; demonstrate free rotation and no interference.
- Produce a drawing of a valve body with sectional views and a hole table that communicates fabrication unambiguously.

## References
- SciOly Wiki – Engineering CAD: https://scioly.org/wiki/index.php/Engineering_CAD
