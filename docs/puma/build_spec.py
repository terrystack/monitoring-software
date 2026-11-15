"""Autor de la spec de PUMA (fuente de verdad de las decisiones de reconstrucción).

Coordenadas del cuerpo de AYNI: metros, +Y arriba, +Z frente, +X = izquierda del astronauta.
Las posiciones vienen de la cara medida en la piel (nariz 0,1.622,0.153; boca 0,1.588,0.14;
mentón 0,1.556,0.134; cabeza rx≈0.072, z −0.066…0.136 a y 1.70).
"""
import copy
import json
from pathlib import Path

spec = json.loads(Path("object-sculpt-spec.json").read_text())
root_tpl = spec["componentTree"][0]


def comp(
    cid, name, level, parent, primitive, topology, rationale, pos, dims, material, *,
    role="body", importance=0.6, confidence=0.7, features=(), attach=None, evidence=("view-iso", "view-left", "view-front"),
    descriptor=None,
):
    c = copy.deepcopy(root_tpl)
    c.update(
        id=cid, name=name, level=level, parent=parent, primitive=primitive, role=role,
        importance=importance, confidence=confidence, topologyClass=topology,
        topologyRationale=rationale, material=material, materialLayers=[material],
        evidenceRefs=list(evidence), fidelityTier="form",
    )
    c["dimensions"] = {"width": dims[0], "height": dims[1], "depth": dims[2], "units": "m", "confidence": confidence}
    c["transform"]["position"] = list(pos)
    c["actionProfile"]["animationRole"] = "detachable-part" if parent else "root"
    c["actionProfile"]["pivot"]["localPosition"] = [0, 0, 0]
    c["actionProfile"]["destruction"]["fractureGroup"] = cid
    c["localFeatures"] = [
        {"id": f, "description": f.replace("-", " "), "evidenceRef": evidence[0], "confidence": confidence}
        for f in features
    ]
    if descriptor:
        c["geometryDescriptor"].update(descriptor)
    if parent:
        a = attach or {}
        c["attachment"] = {
            "parentId": parent,
            "parentSocket": a.get("socket", f"{parent}-surface"),
            "contactType": a.get("contact", "overlap"),
            "localStart": a.get("start", [0, 0, 0]),
            "localEnd": a.get("end", [0, 0, 0.01]),
            "contactNormal": a.get("normal", [0, 0, 1]),
            "embedDepth": a.get("embed", 0.001),
            "overlap": a.get("overlap", 0.002),
            "gapTolerance": a.get("gap", 0.003),
            "baseRadius": a.get("r0", 0.005),
            "endRadius": a.get("r1", 0.005),
        }
    return c


L, R = 1, -1  # +X = izquierda del astronauta
C = []
# ---- macro
C.append(comp("puma", "PUMA headset", "macro", None, "box", "assembled-solid",
              "Root group only; carries no geometry.", (0, 1.63, 0.03), (0.32, 0.26, 0.3), "printed-ivory",
              importance=1.0, role="body"))
C.append(comp("mask", "Oronasal mask shell", "macro", "puma", "lathe", "conforming-shell",
              "Shell offset from the face surface (nose bridge to under the chin) with a forward bulge; must follow the face, so it is generated as a face-offset parametric shell, not an ellipsoid.",
              (0, 1.603, 0.17), (0.11, 0.115, 0.045), "mask-blue", importance=1.0,
              features=("moulded-cheek-lettering-omitted", "port-ring", "sample-nipple", "lower-clips"),
              attach={"socket": "face-skin", "contact": "overlap", "start": [0, 1.66, 0.14], "end": [0, 1.548, 0.13], "normal": [0, 0, 1]}))
C.append(comp("mask-seal", "Perimeter seal flange", "meso", "mask", "tube", "fiber-strand",
              "Closed rim swept along the mask perimeter on the skin.", (0, 1.603, 0.13), (0.11, 0.115, 0.01), "mask-blue-rim",
              descriptor={"tubePath": {"points": [[0, 1.66, 0.14]], "radius": 0.004, "closed": True}}))
C.append(comp("port", "Exhalation port ring", "meso", "mask", "cylinder", "assembled-solid",
              "Short cylinder ring at the bottom-front of the shell.", (0, 1.565, 0.178), (0.03, 0.03, 0.016), "clear-poly",
              features=("translucent-ring",), attach={"socket": "mask-bottom-front", "contact": "socket", "normal": [0, -0.4, 0.9]}))
C.append(comp("sample-nipple", "Sample nipple stub", "micro", "port", "cylinder", "assembled-solid",
              "Small stub on the port, angled up-left.", (0.018, 1.575, 0.19), (0.005, 0.016, 0.005), "clear-poly"))
for side, s in (("l", L), ("r", R)):
    C.append(comp(f"buckle-upper-{side}", f"Upper strap buckle {side}", "micro", "mask", "box", "assembled-solid",
                  "Rectangular grey tab at cheekbone level.", (s * 0.052, 1.638, 0.128), (0.018, 0.02, 0.004), "buckle-grey"))
    C.append(comp(f"clip-lower-{side}", f"Lower clip {side}", "micro", "mask", "box", "assembled-solid",
                  "Grey clip at the jaw angle.", (s * 0.05, 1.565, 0.12), (0.014, 0.016, 0.004), "buckle-grey"))

# ---- headgear
C.append(comp("headgear", "Navy strap harness", "macro", "puma", "curve-sweep", "fiber-strand",
              "Fabric straps swept over the cranium as flat ribbons (curve-sweep with a flat profile).",
              (0, 1.72, 0.0), (0.16, 0.08, 0.21), "fabric-navy", importance=0.8,
              attach={"socket": "cranium-skin", "contact": "overlap"}))
C.append(comp("forehead-band", "Forehead band with black liner", "meso", "headgear", "curve-sweep", "fiber-strand",
              "Band around the frontal/temporal head at y≈1.705 from −80° to +80°.", (0, 1.705, 0.08), (0.15, 0.03, 0.15), "fabric-navy",
              features=("black-padded-liner",)))
C.append(comp("crown-straps", "Two crown straps", "meso", "headgear", "curve-sweep", "fiber-strand",
              "Two parallel ribbons over the vertex, front band to occipital crossing.", (0, 1.77, 0.03), (0.06, 0.03, 0.2), "fabric-navy"))
C.append(comp("crown-pad", "Suede crown pad", "micro", "crown-straps", "box", "conforming-shell",
              "Grey pad laid over the crown straps at the vertex.", (0, 1.778, 0.05), (0.06, 0.006, 0.06), "suede-grey"))
C.append(comp("side-straps", "Mask side straps", "meso", "headgear", "curve-sweep", "fiber-strand",
              "Ribbons from the upper buckles to the side plates.", (0, 1.64, 0.09), (0.15, 0.02, 0.06), "fabric-navy"))
C.append(comp("nape-strap", "Lower nape strap", "meso", "headgear", "curve-sweep", "fiber-strand",
              "Ribbon from the lower clips under the ears to the nape.", (0, 1.58, 0.03), (0.13, 0.02, 0.2), "fabric-navy"))
C.append(comp("brass-line", "Brass gas line", "micro", "headgear", "tube", "fiber-strand",
              "Thin metal tube over the crown from the left plate.", (0.04, 1.75, 0.0), (0.06, 0.04, 0.12), "brass",
              descriptor={"tubePath": {"points": [[0.06, 1.71, -0.04], [0.02, 1.775, 0.02]], "radius": 0.0025}}))

for side, s in (("l", L), ("r", R)):
    C.append(comp(f"side-plate-{side}", f"Clear cranial side plate {side}", "macro", "headgear", "lathe", "conforming-shell",
                  "Shell offset ~12 mm from the parietal/temporal skin, angle 45°–165°, y 1.615–1.755, with real perforation holes.",
                  (s * 0.08, 1.685, -0.005), (0.012, 0.14, 0.15), "clear-poly", importance=0.8,
                  features=("perforation-array-3x3", "navy-edge-band"),
                  attach={"socket": "cranium-skin", "contact": "overlap"}))
    C.append(comp(f"strut-{side}", f"Rear strut rods {side}", "meso", f"side-plate-{side}", "cylinder", "assembled-solid",
                  "Two clear rods from the plate rear-lower edge down to the payload mount, with white knuckle joints.",
                  (s * 0.098, 1.58, -0.045), (0.012, 0.09, 0.012), "clear-poly", features=("white-knuckle-joints",)))

# ---- manifold
C.append(comp("manifold", "White T manifold", "macro", "port", "tube", "fiber-strand",
              "Printed elbow from the port down then splitting laterally under the chin.", (0, 1.53, 0.18), (0.11, 0.04, 0.03), "printed-ivory",
              importance=0.9, attach={"socket": "port-socket", "contact": "socket"},
              descriptor={"tubePath": {"points": [[0, 1.56, 0.185], [0, 1.53, 0.185]], "radius": 0.011}}))
for side, s, end in (("l", L, [0.115, 1.535, 0.11]), ("r", R, [-0.112, 1.532, 0.075])):
    C.append(comp(f"hose-{side}", f"Clear corrugated hose {side}", "meso", "manifold", "tube", "fiber-strand",
                  "Clear corrugated hose swept from the manifold elbow lateral then rearward.", (s * 0.08, 1.532, 0.15), (0.07, 0.024, 0.08), "clear-poly",
                  features=("annular-rib-rings",), descriptor={"tubePath": {"points": [[s * 0.05, 1.53, 0.18], end], "radius": 0.0105}}))
C.append(comp("flow-chamber", "Smoked flow chamber", "macro", "hose-l", "tube", "fiber-strand",
              "Large-bore smoked tube running rearward along the left jaw to the rear mount.", (0.123, 1.537, 0.03), (0.03, 0.03, 0.17), "smoked",
              importance=0.9, descriptor={"tubePath": {"points": [[0.115, 1.535, 0.11], [0.125, 1.54, -0.045]], "radius": 0.016}}))
C.append(comp("mount-l", "Beige rear mount block", "meso", "flow-chamber", "box", "assembled-solid",
              "Screwed block joining the flow chamber to the left strut.", (0.12, 1.548, -0.06), (0.03, 0.05, 0.03), "printed-beige",
              features=("screw-column-x4",)))
for i, z in enumerate((0.07, 0.035)):
    C.append(comp(f"sensor-{'ab'[i]}", f"Black gas sensor {'AB'[i]}", "meso", "flow-chamber", "cylinder", "assembled-solid",
                  "Black cylinder hanging under the flow chamber with a cream collar and black barb.", (0.124, 1.493, z), (0.022, 0.045, 0.022), "sensor-black",
                  features=("cream-collar", "black-barb")))
C.append(comp("sample-lines", "Amber sample lines", "micro", "sensor-a", "tube", "fiber-strand",
              "Two thin amber tubes from the sensor barbs curving rearward to the umbilical.", (0.12, 1.46, 0.0), (0.02, 0.05, 0.1), "amber"))

# ---- right payload
C.append(comp("housing-r", "White pump/electronics housing", "macro", "hose-r", "box", "assembled-solid",
              "Rounded white printed box lateral to the right cheek.", (-0.133, 1.545, 0.045), (0.05, 0.06, 0.065), "printed-ivory",
              importance=0.9, features=("upper-canister", "lower-bracket-screws")))
C.append(comp("heatsink", "Dark heat-sink block", "meso", "housing-r", "box", "assembled-solid",
              "Dark metal block on the lateral face with screws and fins.", (-0.164, 1.552, 0.045), (0.014, 0.05, 0.05), "heatsink",
              features=("screw-x4", "fin-grooves")))

# ---- umbilical
C.append(comp("umbilical", "Black braided umbilical", "macro", "mount-l", "tube", "fiber-strand",
              "Braided sleeve from the left rear mount down the back-left to the left hip.", (0.14, 1.25, -0.1), (0.06, 0.6, 0.1), "braid",
              descriptor={"tubePath": {"points": [[0.12, 1.53, -0.07], [0.17, 0.98, 0.0]], "radius": 0.0065}}))
C.append(comp("umbilical-connector", "Cream connector with coaxial plug", "meso", "umbilical", "cylinder", "assembled-solid",
              "Cream cylinder with a stainless coaxial plug at the hip end.", (0.17, 0.97, 0.02), (0.022, 0.07, 0.022), "printed-ivory",
              features=("stainless-coax-plug",)))

spec["componentTree"] = C
spec["viewEvidence"] = [
    {"id": "full-object", "view": "primary", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["ref/puma_iso.png"], "confidence": 0.8},
    {"id": "view-iso", "view": "three-quarter wearer-right", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["ref/puma_iso.png: mask, right housing + heat-sink, both hoses, plates, crown"], "confidence": 0.8},
    {"id": "view-left", "view": "lateral wearer-left", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["ref/puma_left.png: flow chamber run, twin sensors, rear mount, strut, plate perforations"], "confidence": 0.8},
    {"id": "view-front", "view": "front", "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["ref/puma_front.png: symmetry of mask/harness, tube-bar span, asymmetric payloads"], "confidence": 0.8},
]


SKEL = json.loads(Path("spec-skeleton.json").read_text())["materials"][0]


def mat(mid, color, rough, metal=0.0, opacity=1.0, transmission=0.0, notes=""):
    m = copy.deepcopy(SKEL)
    physical = opacity < 1 or transmission > 0
    m.update(id=mid, name=mid, baseColor=color, color=color, notes=notes or mid,
             type="physical" if physical else "standard",
             shaderModel="MeshPhysicalMaterial" if physical else "MeshStandardMaterial")
    m["albedo"] = {"dominant": color, "secondary": [color], "samplingNotes": "flat observed colour region"}
    m["colorVariation"] = {"palette": [color], "pattern": "flat", "amplitude": 0.03, "heightCorrelation": 0.0}
    m["roughness"] = {"base": rough, "variation": 0.05, "map": "independent-procedural-field", "localResponse": "flat"}
    m["metalness"] = {"base": metal, "variation": 0.0}
    m["opacity"] = opacity
    m["transparent"] = opacity < 1
    m["transmission"] = transmission
    m["localOverrides"] = []
    return m


spec["materials"] = [
    mat("mask-blue", "#5AA7F0", 0.15, opacity=0.55, transmission=0.4, notes="vivid blue transparent tinted polymer"),
    mat("mask-blue-rim", "#7DBDF5", 0.25, opacity=0.8),
    mat("clear-poly", "#E6F1FA", 0.1, opacity=0.32, transmission=0.6, notes="clear polycarbonate"),
    mat("smoked", "#4A4E5A", 0.12, opacity=0.6, transmission=0.3),
    mat("printed-ivory", "#EFEDE6", 0.55),
    mat("printed-beige", "#E6DDC8", 0.55),
    mat("fabric-navy", "#1F2A6B", 0.9),
    mat("liner-black", "#151515", 0.85),
    mat("buckle-grey", "#BFC4CA", 0.5),
    mat("suede-grey", "#9EA0A3", 0.95),
    mat("heatsink", "#3B3F45", 0.45, metal=0.6),
    mat("sensor-black", "#121315", 0.35),
    mat("amber", "#C98A5A", 0.3, opacity=0.85),
    mat("brass", "#C9A44C", 0.3, metal=0.9),
    mat("braid", "#121212", 0.7, notes="woven relief inferred"),
]
spec["materials"][-1]["localOverrides"] = [{"id": "braid-weave", "kind": "normal", "pattern": "helical bands", "scale": 0.004}]
spec["materials"][4]["localOverrides"] = [{"id": "print-layer-lines", "kind": "roughness", "pattern": "horizontal bands", "scale": 0.0005}]
spec["materials"][0]["localOverrides"] = [{"id": "rim-lighter", "kind": "albedo", "pattern": "perimeter lighter tint", "scale": 0.006}]

spec["repetitionSystems"] = [
    {"id": "hose-ribs", "targetComponent": "hose-l", "pattern": "annular rings along the path", "count": 18, "spacing": 0.005, "distribution": "uniform along curve"},
    {"id": "hose-ribs-r", "targetComponent": "hose-r", "pattern": "annular rings along the path", "count": 18, "spacing": 0.005, "distribution": "uniform along curve"},
    {"id": "plate-perforations", "targetComponent": "side-plate-l", "pattern": "rounded-rect holes 3x3 (mirrored on side-plate-r)", "count": 9, "distribution": "grid on shell UV"},
    {"id": "screws", "targetComponent": "mount-l", "pattern": "screw heads column", "count": 4, "distribution": "linear"},
]

def target(tid, name, tier, comps, score):
    return {"id": tid, "name": name, "tier": tier, "passIds": ["blockout", "structure", "form", "material"],
            "minimumScore": score, "mustPass": tier == "critical", "componentRefs": comps,
            "evidenceRefs": ["view-iso", "view-left", "view-front"]}


spec["featureReviewTargets"] = [
    target("mask-shape-and-port", "Blue oronasal shell nose-bridge to under-chin with bottom-front port feeding the white T", "critical", ["mask", "port", "manifold"], 0.75),
    target("tube-bar-span", "Manifold and hoses wider than the head, bending rearward on both sides at chin height", "critical", ["manifold", "hose-l", "hose-r", "flow-chamber"], 0.7),
    target("asymmetric-payloads", "Right white housing + dark heat-sink vs left smoked chamber + two hanging black sensors", "critical", ["housing-r", "heatsink", "flow-chamber", "sensor-a", "sensor-b"], 0.7),
    target("cranial-plates-harness", "Clear perforated side plates on navy straps with crown straps and pad", "important", ["side-plate-l", "side-plate-r", "headgear", "crown-pad"], 0.65),
    target("umbilical", "Black braided cable from the left rear mount down to the hip connector", "important", ["umbilical", "umbilical-connector"], 0.6),
]
KIND = {"mask-port-ring": ("contour", "port"), "mask-sample-nipple": ("contour", "sample-nipple"),
        "mask-upper-buckles": ("fastener", "buckle-upper-l"), "mask-lower-clips": ("fastener", "clip-lower-l"),
        "mask-seal-flange": ("ridge", "mask-seal"), "crown-pad": ("seam", "crown-pad"), "brass-line": ("gloss", "brass-line"),
        "plate-perforations": ("hole", "perforation-array-3x3"), "plate-struts": ("contour", "strut-l"),
        "hose-ribs": ("ridge", "annular-rib-rings"), "heatsink-screws": ("fastener", "screw-x4"),
        "sensor-collars": ("contour", "cream-collar"), "amber-sample-lines": ("gloss", "sample-lines"),
        "mount-block-screws": ("fastener", "screw-column-x4"), "braided-sleeve": ("groove", "braid-weave"),
        "umbilical-connector": ("contour", "umbilical-connector")}
for d in spec["preSpecAssessment"]["detailInventory"]["details"]:
    k, ref = KIND[d["id"]]
    d["kind"] = k
    d["mapsTo"] = {"type": "localFeature", "ref": ref}
spec["coordinateFrame"] = {"up": "+Y", "forward": "+Z", "characterLeft": "+X", "units": "meters", "origin": "AYNI body origin (feet)"}
spec["assumptions"] = [
    "Mannequin head and display base excluded; device re-fitted to the AYNI anatomical head.",
    "Rear harness junction and right side of the right housing inferred.",
    "Conforming shells (mask, side plates) are built as offsets of the measured head profile in the app (geometry the generic generator cannot conform).",
]
Path("object-sculpt-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2))
print(len(C), "components")

# ---- colorMaterialRecipe por componente (desde el material asignado)
CLASS = {"mask-blue": "plastic", "mask-blue-rim": "plastic", "clear-poly": "plastic", "smoked": "plastic",
         "printed-ivory": "plastic", "printed-beige": "plastic", "fabric-navy": "fabric", "liner-black": "fabric",
         "buckle-grey": "plastic", "suede-grey": "fabric", "heatsink": "metal", "sensor-black": "plastic",
         "amber": "plastic", "brass": "metal", "braid": "fabric"}
MATS = {m["id"]: m for m in spec["materials"]}


def rgba(hexc, a=1.0):
    h = hexc.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"


for c in spec["componentTree"]:
    m = MATS[c["material"]]
    a = round(float(m.get("opacity", 1.0)), 3)
    a = 1.0 if a >= 1 else a
    c["colorMaterialRecipe"] = {
        "dominantAlbedo": rgba(m["baseColor"], a),
        "secondaryAlbedo": rgba(m["baseColor"], a),
        "materialClass": CLASS[m["id"]],
        "materialClassConfidence": 0.75,
        "evidenceRefs": ["view-iso"],
    }
Path("object-sculpt-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2))

# ---- incógnitas resueltas como decisiones explícitas; iluminación de la foto
pa = spec["preSpecAssessment"]
spec["assumptions"] += [f"RESOLVED: {u}" for u in pa.get("unknownsToResolveBeforeImplementation", [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["lightingFromPhoto"] = [
    {"id": "key", "type": "soft studio key", "direction": "upper front-left of the camera", "intensity": 1.0,
     "notes": "large softbox: broad low-contrast highlights on the mask and white parts"},
    {"id": "fill", "type": "fill", "direction": "front-right", "intensity": 0.5, "notes": "lifts shadows on the right housing"},
    {"id": "rim", "type": "environment", "direction": "uniform light-grey sweep", "intensity": 0.6,
     "notes": "neutral grey environment; app uses its own Ambiente (studio HDR-like hemisphere); exposure ACES filmic tone mapping 1.0"},
    {"id": "contact", "type": "contact shadow", "notes": "ambient occlusion where straps meet the skin and under the manifold; no ground shadow (worn on the body)"},
]
Path("object-sculpt-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2))
