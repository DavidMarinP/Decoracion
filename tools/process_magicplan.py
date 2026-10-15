import pdfplumber
import pypdfium2 as pdfium
import json

pdf_path = 'C:/Users/marin/.gemini/antigravity/brain/877cbb2d-acbb-44eb-b170-385bc4573cf9/.user_uploaded/media_1788975574684.pdf'

# 1. Render high-res image of page for the 3D ground plane
pdf_doc = pdfium.PdfDocument(pdf_path)
page = pdf_doc[0]
image = page.render(scale=3).to_pil()
image.save('plano_magicplan.png')
print("Rendered plano_magicplan.png:", image.size)

# 2. Extract vector walls
pt_per_m = 1000.0 / 78.0 * (72.0 / 25.4) # 36.3416 pt / meter

with pdfplumber.open(pdf_path) as pdf:
    p = pdf.pages[0]
    page_w = p.width
    page_h = p.height
    
    wall_polys = []
    for i, c in enumerate(p.curves):
        pts = c.get('pts', [])
        if c.get('fill') == True and len(pts) >= 4:
            color = c.get('non_stroking_color')
            if color == 0 or color == (0,0,0) or color == [0,0,0] or color == [0] or color is None:
                w = c.get('width', 0)
                h = c.get('height', 0)
                if w > 5 or h > 5:
                    wall_polys.append({
                        'id': i,
                        'w_pt': round(w, 2),
                        'h_pt': round(h, 2),
                        'w_m': round(w / pt_per_m, 2),
                        'h_m': round(h / pt_per_m, 2),
                        'bbox': [round(c['x0'], 2), round(c['top'], 2), round(c['x1'], 2), round(c['bottom'], 2)],
                        'pts': [[round(pt[0], 2), round(pt[1], 2)] for pt in pts]
                    })

print(f"Extracted {len(wall_polys)} wall polygons from MagicPlan.")

# Calculate apartment center to center the 3D scene around (0, 0)
# Apartment bounds in PDF points:
# x in [45, 545], y in [105, 755]
center_x = (45.0 + 545.0) / 2.0
center_y = (105.0 + 755.0) / 2.0

data = {
    'page_w_pt': page_w,
    'page_h_pt': page_h,
    'page_w_m': page_w / pt_per_m,
    'page_h_m': page_h / pt_per_m,
    'pt_per_m': pt_per_m,
    'center_x_pt': center_x,
    'center_y_pt': center_y,
    'wall_polys': wall_polys
}

with open('magicplan_walls.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Saved magicplan_walls.json successfully.")
