import json

with open('magicplan_walls.json') as f:
    d = json.load(f)

# Page center in PDF points
cx = 297.5
cy = 421.0
scale = d['pt_per_m']

def to_meters(pts):
    return [[round((p[0] - cx) / scale, 4), round((p[1] - cy) / scale, 4)] for p in pts]

polys = d['wall_polys']

data = {
    'page_w_m': round(d['page_w_pt'] / scale, 4),
    'page_h_m': round(d['page_h_pt'] / scale, 4),
    'rooms': [
        { 'name': 'Salón (51.81 m²)', 'type': 'room', 'pts': to_meters(polys[7]['pts']) },
        { 'name': 'Cocina (34.79 m²)', 'type': 'room', 'pts': to_meters(polys[5]['pts']) },
        { 'name': 'Habitación Álex (16.29 m²)', 'type': 'room', 'pts': to_meters(polys[6]['pts']) },
        { 'name': 'Habitación Nuestra (20.29 m²)', 'type': 'room', 'pts': to_meters(polys[3]['pts']) },
        { 'name': 'Habitación Jorge & Baño (19.35 m²)', 'type': 'room', 'pts': to_meters(polys[0]['pts']) },
        { 'name': 'Baño 1 (4.85 m²)', 'type': 'room', 'pts': to_meters(polys[1]['pts']) }
    ],
    'pilasters': [
        to_meters(polys[2]['pts']),
        to_meters(polys[4]['pts']),
        to_meters(polys[8]['pts']),
        to_meters(polys[10]['pts']),
        to_meters(polys[11]['pts'])
    ],
    'balcon': {
        'pts': to_meters(polys[9]['pts'])
    },
    'furniture_targets': {
        'sofa': { 'x': 2.05, 'z': -5.45, 'rotY': 0 },
        'table': { 'x': -2.50, 'z': -4.20, 'rotY': 0 },
        'kitchen_island': { 'x': -3.80, 'z': 3.80, 'rotY': 0 }
    }
}

js_content = f"// Datos vectoriales extraídos directamente del PDF original de MagicPlan (Plano 1)\nexport const magicPlanData = {json.dumps(data, indent=2)};\n"

with open('magicplan_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Generated magicplan_data.js successfully.")
