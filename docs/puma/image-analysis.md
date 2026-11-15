# PUMA — image analysis (3 views: iso, left, front)

Frame: wearer frame, +Y up, +Z forward (face), +X = wearer's LEFT. Front view shows the wearer's
right on image-left. The left view (head facing image-left) shows the wearer's LEFT side.
Excluded from the reconstruction: white expanded-polystyrene mannequin head and black square
base (display props, not part of the device). The device is re-fitted to the app's anatomical
head (skin mesh, head y 1.54–1.78 m).

## Layer 1 — Identification
- Work type: wearable metabolic gas-analysis headset (portable unit for metabolic analysis).
- Classification: wearable medical/scientific instrument; head-mounted breathing interface.
- primaryDomain: `object` (worn on a character, but no character reconstruction).
- Confidence 0.85 (identification as the NASA Glenn PUMA family is inference from context given by
  the user; the observable object is an oronasal mask + harness + lateral sensor modules).

## Layer 2 — Form & silhouette
- Overall: head-encircling harness (shell-like, follows a cranial ellipsoid) + frontal half-dome
  (mask) + a horizontal tube bar below the chin that spans ~3× head width (front view) and bends
  rearward on both sides + two lateral payloads at chin height + a looping umbilical below.
- Symmetry: harness and mask approximately bilateral; payloads ASYMMETRIC (right: white box +
  dark heat-sink block; left: smoked large-bore tube + twin hanging black cylinders).
- Shape language: mixed — organic (mask shell, side plates conforming to the cranium),
  geometric (boxes, cylinders, elbows), swept (corrugated hoses, braided cable).
- Reference dimension: head width at temples ≈ 0.15 m. Mask ≈ 0.11 m wide × 0.12 m tall
  (inferred from the face it covers: nose bridge to under the chin). Tube bar lateral extent
  ≈ ±0.13 m from the mid-sagittal plane (perspective exaggerates it in the front view).

## Layer 3 — Macro → meso → micro
- M1 mask: blue shell (meso: shell, perimeter seal flange, front circular exhalation port ring,
  sample nipple stub; micro: moulded lettering on cheeks, two upper buckle tabs, two lower
  clip tabs).
- M2 headgear: navy fabric (meso: two parallel crown straps over the vertex, forehead/temporal
  band with black padded liner, lower nape/chin strap passing under the mask; micro: grey
  suede crown pad, stitching).
- M3 side plates ×2 (mirror pair): clear polycarbonate cranial plates over temple/parietal
  (meso: plate, oval perforation array ~3 columns × 3 rows, navy edge band, rear vertical
  strut rods with white knuckle joints; micro: screws).
- M4 breathing manifold: white printed T at the mask port (meso: central elbow, two
  lateral elbows), clear corrugated hoses ×2 (micro: rib rings), smoked large-bore
  flow chamber on the wearer's left (meso: straight run + rear elbow + beige screwed mount block).
- M5 right payload (wearer's right): white printed housing (meso: upper cylindrical
  canister, lower bracket block with two screws), dark metal heat-sink/fan block with screws on
  the lateral face, black lead cable.
- M6 left sensors (wearer's left): two black cylinders hanging below the flow chamber
  (meso: body, cream collar, black barb fitting), two amber/copper sample lines.
- M7 umbilical: black braided sleeve from the left rear mount, looping down and forward to a
  cream cylindrical connector with a stainless coaxial plug and a thin black lead.
- M8 brass gas line: gold tube from the left side plate over the crown along the straps.

## Layer 4 — Spatial relationships
- <mask, attached-to, face> contact: overlap (seal flange on skin, nose bridge to under chin).
- <manifold-T, socketed-into, mask port> butt joint, below the chin, in front of the neck.
- <hoses, connect, T → right housing / T → flow chamber> socket joints; both run lateral then rearward.
- <right housing, mounted-on, right side-plate strut> at chin height, lateral to the cheek.
- <flow chamber, mounted-on, left side-plate strut> via beige block behind the ear line.
- <black sensors, below, flow chamber> attached by fittings; hang ~5 cm.
- <side plates, attached-to, headgear straps>, <straps, wrap, cranium>.
- <umbilical, exits, left rear mount> then drapes down (in the app: routed down the back-left to the hip).

## Layer 5 — Materials (PBR)
- Mask shell: dielectric, transparent-tinted vivid blue, roughness ~0.15, transmission ~0.5.
- Side plates / hoses: clear dielectric, roughness ~0.1, opacity ~0.3–0.4.
- Flow chamber: smoked translucent dark grey, roughness ~0.1, opacity ~0.6.
- Printed parts (elbows, housing, mounts, connector): ivory dielectric, roughness ~0.55, matte.
- Fabric straps: navy, roughness ~0.9; liner black roughness ~0.85.
- Buckles: light grey plastic roughness ~0.5.
- Heat-sink: dark grey metal, metalness ~0.6, roughness ~0.45.
- Sensors: black satin plastic roughness ~0.35; collars cream.
- Sample lines: amber/copper translucent, roughness ~0.3.
- Brass line: metal, metalness ~0.9, roughness ~0.3. Braided sleeve: black, roughness ~0.7 with
  a woven normal relief (inferred).

## Layer 6 — Colour & finish
- Vivid blue, high value (mask); navy, low value, mid saturation (straps); ivory near-white
  (printed parts); near-black (sensors, sleeve); amber (sample lines); gold (brass line);
  neutral grey (buckles, suede pad). Gloss: mask/plates/hoses; matte: fabric, printed parts.

## Layer 7 — Identity-defining features
1. Blue oronasal mask with a bottom-front port feeding a white T manifold under the chin.
2. Horizontal tube bar wider than the head, bending rearward on both sides.
3. Asymmetric payloads: right white housing + dark heat-sink; left smoked flow chamber + two
   hanging black sensors with amber sample lines.
4. Clear perforated cranial side plates on navy strap harness, with rear vertical struts.
5. Black braided umbilical ending in a cream connector.

## Layer 8 — Uncertainty
- Hidden: wearer's right side of the right housing beyond the heat-sink; rear of the harness
  (occipital junction); interior of the mask; exact routing of the umbilical when worn.
- Uncertain: exact plate outline at the occiput; whether the crown straps join a rear plate.
- Function of each lateral module is inferred (O₂/CO₂ sensors on the left, pump/electronics on
  the right) — not verifiable from pixels.
- Mannequin-to-anatomical refit changes absolute proportions; reconstruction is stylized-accurate,
  not metrically exact.
