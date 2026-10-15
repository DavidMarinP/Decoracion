import pdfplumber
import json

pdf_path = 'C:/Users/marin/.gemini/antigravity/brain/877cbb2d-acbb-44eb-b170-385bc4573cf9/.user_uploaded/media_1788975574684.pdf'

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]
    print("Page size:", page.width, page.height)
    
    # Scale: 1:78. 1 meter in PDF points:
    pt_per_meter = 1000.0 / 78.0 * (72.0 / 25.4)
    print("Points per meter:", pt_per_meter)

    # Let's inspect curves with pts
    shapes = []
    for i, c in enumerate(page.curves):
        pts = c.get('pts', [])
        # MagicPlan walls are closed filled polygons with black fill
        # Or look for objects that form walls
        if len(pts) >= 4 and (c.get('width', 0) > 10 or c.get('height', 0) > 10):
            shapes.append({
                'id': i,
                'bbox': [round(c['x0'], 2), round(c['top'], 2), round(c['x1'], 2), round(c['bottom'], 2)],
                'pts': [[round(p[0], 2), round(p[1], 2)] for p in pts],
                'fill': c.get('fill'),
                'stroke': c.get('stroke'),
                'non_stroking_color': c.get('non_stroking_color')
            })
    
    print(f"Found {len(shapes)} candidate wall shapes")
    with open('shapes.json', 'w') as f:
        json.dump(shapes, f, indent=2)
