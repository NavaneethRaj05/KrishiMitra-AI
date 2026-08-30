import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_architecture_diagram(output_img_path):
    """Generates a high-resolution, professional Methodology & Architecture diagram image matching the clean hierarchical tree layout, lavender box styling, curved database cylinders, and grey arrow label boxes from the reference slide."""
    fig, ax = plt.subplots(figsize=(13.5, 8.2), dpi=300)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#ffffff')
    ax.set_xlim(0, 135)
    ax.set_ylim(0, 82)
    ax.axis('off')

    # Title Banner (matching "Slide 9: Methodology & Architecture Diagram")
    ax.text(67.5, 78, "Methodology & Architecture Diagram", color="#0f172a", weight="bold", fontsize=15, ha="center", va="center")

    # Helper 1: Draw Colored Service/Client Rectangle Box
    def draw_box(x, y, w, h, title, subtitle=None, bg_color="#f3e8ff", border_color="#8b5cf6", text_color="#3b0764"):
        rect = patches.FancyBboxPatch((x, y), w, h,
                                      boxstyle="round,pad=0.3,rounding_size=0.8",
                                      facecolor=bg_color, edgecolor=border_color, linewidth=1.5)
        ax.add_patch(rect)
        if subtitle:
            ax.text(x + w/2.0, y + h*0.64, title, color=text_color, weight="bold", fontsize=8.2, ha="center", va="center")
            ax.text(x + w/2.0, y + h*0.28, subtitle, color="#475569", fontsize=6.5, ha="center", va="center")
        else:
            ax.text(x + w/2.0, y + h*0.5, title, color=text_color, weight="bold", fontsize=9.0, ha="center", va="center")

    # Helper 2: Draw Clean 3D Solid Curved Cylinder Database Shape (No internal lines cutting body)
    def draw_cylinder_db(x, y, w, h, title, subtitle=None, bg_color="#f3e8ff", border_color="#8b5cf6", text_color="#3b0764"):
        ellipse_h = min(h * 0.24, 1.6)
        top_y = y + h - ellipse_h / 2.0
        bottom_y = y + ellipse_h / 2.0

        # 1. Fill background of entire cylinder (body + bottom ellipse)
        bottom_fill = patches.Ellipse((x + w/2.0, bottom_y), w, ellipse_h,
                                      facecolor=bg_color, edgecolor="none", zorder=1)
        ax.add_patch(bottom_fill)

        body_fill = patches.Rectangle((x, bottom_y), w, top_y - bottom_y,
                                      facecolor=bg_color, edgecolor="none", zorder=1)
        ax.add_patch(body_fill)

        # 2. Outer Stroke Outlines
        ax.plot([x, x], [bottom_y, top_y], color=border_color, lw=1.6, zorder=3)
        ax.plot([x + w, x + w], [bottom_y, top_y], color=border_color, lw=1.6, zorder=3)

        # Bottom curve arc ONLY (theta1=180 to 360) - NO internal top curve inside body!
        bottom_arc = patches.Arc((x + w/2.0, bottom_y), w, ellipse_h,
                                 angle=0, theta1=180, theta2=360, edgecolor=border_color, lw=1.6, zorder=3)
        ax.add_patch(bottom_arc)

        # Top full ellipse cap
        top_cap = patches.Ellipse((x + w/2.0, top_y), w, ellipse_h,
                                  facecolor=bg_color, edgecolor=border_color, linewidth=1.6, zorder=4)
        ax.add_patch(top_cap)

        # 3. Clean Text Positioning inside solid body
        body_mid_y = (bottom_y + top_y) / 2.0 - 0.2

        if subtitle:
            ax.text(x + w/2.0, body_mid_y + 0.85, title, color=text_color, weight="bold", fontsize=8.0 if h > 5 else 6.8, ha="center", va="center", zorder=5)
            ax.text(x + w/2.0, body_mid_y - 0.85, subtitle, color="#475569", fontsize=6.3 if h > 5 else 5.4, ha="center", va="center", zorder=5)
        else:
            ax.text(x + w/2.0, body_mid_y, title, color=text_color, weight="bold", fontsize=8.6 if h > 5 else 7.2, ha="center", va="center", zorder=5)

    # Helper 3: Draw Connecting Arrow with Line Style, Color & Grey Label Box
    def draw_arrow_with_label(start_pt, end_pt, label_text, linestyle="-", line_color="#64748b", lw=1.6):
        arrow = dict(arrowstyle="->", lw=lw, color=line_color, linestyle=linestyle)
        ax.annotate("", xy=end_pt, xytext=start_pt, arrowprops=arrow)
        
        # Calculate mid point for label box
        mid_x = (start_pt[0] + end_pt[0]) / 2.0
        mid_y = (start_pt[1] + end_pt[1]) / 2.0
        
        ax.text(mid_x, mid_y, f"  {label_text}  ", fontsize=6.8, weight="bold", color="#1e293b",
                ha="center", va="center", zorder=6,
                bbox=dict(boxstyle="round,pad=0.35", fc="#f1f5f9", ec="#cbd5e1", lw=0.9))

    # --- LEVEL 1: TOP NODE (Client Mobile App / PWA) ---
    draw_box(43, 67, 49, 8.0, "React Native Mobile App / React 18 PWA", "Voice Assistant | Leaf Scanner | Soil Advisor | Buyer Mandi & Sourcing Portal", bg_color="#f3e8ff", border_color="#8b5cf6", text_color="#3b0764")

    # Ancillary Edge Storage Node (Top Left)
    draw_cylinder_db(5, 67, 26, 8.0, "IndexedDB Edge Store", "Sub-150ms ONNX Edge Cache", bg_color="#ecfdf5", border_color="#10b981", text_color="#064e3b")
    draw_arrow_with_label((43, 71.0), (31, 71.0), "Offline Edge Engine", linestyle="--", line_color="#0284c7")

    # --- LEVEL 2: MIDDLE GATEWAY NODE ---
    draw_box(47, 51, 41, 8.0, "Express.js Gateway", "JWT Auth Security, Proxy & Offline Sync Queue", bg_color="#eff6ff", border_color="#3b82f6", text_color="#1e40af")

    # Connection: Level 1 -> Level 2 (Solid Blue Arrow)
    draw_arrow_with_label((67.5, 67), (67.5, 59.0), "HTTPS / Voice / Leaf Photo / Sourcing API", linestyle="-", line_color="#2563eb", lw=1.8)

    # --- LEVEL 3: MIDDLE-TIER STORAGE & FASTAPI ML SERVICE ---
    draw_cylinder_db(10, 33, 33, 8.8, "MongoDB", "Saves User Profiles, Harvest Lots & Contracts", bg_color="#ecfdf5", border_color="#10b981", text_color="#064e3b")
    draw_box(56, 33, 45, 8.8, "FastAPI ML Service", "Async Model Pipelines & Analytics Controller", bg_color="#faf5ff", border_color="#a855f7", text_color="#581c87")

    # Connections: Level 2 -> Level 3 (Branch A: Solid Green, Branch B: Solid Purple)
    draw_arrow_with_label((57, 51), (26.5, 41.8), "Saves Profile / Coordinates", linestyle="-", line_color="#059669", lw=1.6)
    draw_arrow_with_label((73, 51), (78.5, 41.8), "Proxies ML Queries", linestyle="-", line_color="#7c3aed", lw=1.6)

    # Ancillary Market Price Forecaster Node (Middle Right)
    draw_box(106, 33, 24, 8.8, "AI Price Forecaster", "Mandi Time-Series Predictor", bg_color="#ccfbf1", border_color="#14b8a6", text_color="#134e4a")
    draw_arrow_with_label((101, 37.4), (106, 37.4), "Price Forecast", linestyle=":", line_color="#0d9488", lw=1.6)

    # --- LEVEL 4: BOTTOM TIER (Databases & Processing Engines) ---
    # Node 4A: ChromaDB (Cylinder - Orange)
    draw_cylinder_db(3, 9, 28, 9.8, "ChromaDB Vector Store", "ICAR Handbook Embeddings", bg_color="#fff7ed", border_color="#ea580c", text_color="#7c2d12")
    
    # Node 4B: Neo4j (Cylinder - Amber)
    draw_cylinder_db(34, 9, 28, 9.8, "Neo4j Graph Database", "KAG Knowledge Graph", bg_color="#fffbeb", border_color="#f59e0b", text_color="#78350f")
    
    # Node 4C: CNN Classifier & XGBoost (Rectangle - Green)
    draw_box(65, 9, 34, 9.8, "PyTorch CNN & XGBoost Models", "Leaf Disease (95.4%) + SHAP Soil XAI", bg_color="#f0fdf4", border_color="#22c55e", text_color="#14532d")
    
    # Node 4D: Gemini Cloud / Ollama (Rectangle - Rose Fallback)
    draw_box(102, 9, 29, 9.8, "Gemini Cloud / Ollama Fallback", "LLaMA 3.1 8B & LLaVA 7B Generative XAI", bg_color="#fff1f2", border_color="#f43f5e", text_color="#881337")

    # Connections: Level 3 -> Level 4 (4 Branching Arrows from FastAPI ML Service)
    draw_arrow_with_label((64, 33), (17, 18.8), "RAG Semantic Search", linestyle=":", line_color="#ea580c", lw=1.6)
    draw_arrow_with_label((72, 33), (48, 18.8), "KAG Structured Facts", linestyle=":", line_color="#d97706", lw=1.6)
    draw_arrow_with_label((80, 33), (82, 18.8), "Local Pathogen Analysis", linestyle="-", line_color="#16a34a", lw=1.6)
    draw_arrow_with_label((88, 33), (116.5, 18.8), "Generates Advisor Response", linestyle="--", line_color="#dc2626", lw=1.6)

    # Bottom Shape & Line Legend Bar
    legend_box = patches.FancyBboxPatch((5, 0.8), 125, 5.2,
                                        boxstyle="round,pad=0.3,rounding_size=0.8",
                                        facecolor="#f8fafc", edgecolor="#cbd5e1", linewidth=1.0)
    ax.add_patch(legend_box)
    ax.text(7.5, 3.4, "LEGEND:", color="#0f172a", weight="bold", fontsize=7.5, va="center")

    # Legend Items with Generous Vertical Height (h = 4.0)
    draw_box(22, 1.4, 25, 4.0, "[ Rectangle ]", "Client / Gateway / Processing Node", bg_color="#f3e8ff", border_color="#8b5cf6", text_color="#3b0764")
    draw_cylinder_db(50, 1.4, 25, 4.0, "[( Cylinder )]", "Database / Vector / Graph Storage", bg_color="#fff7ed", border_color="#ea580c", text_color="#7c2d12")
    
    # Line Legend Icons
    ax.text(82, 4.4, "―  Solid Line: Sync Core API Pipeline", fontsize=7.0, weight="bold", color="#1e3a8a")
    ax.text(82, 3.4, "• •  Dotted Line: RAG / KAG Search", fontsize=7.0, weight="bold", color="#ea580c")
    ax.text(82, 2.4, "- -  Dashed Line: Offline / Fallback", fontsize=7.0, weight="bold", color="#dc2626")

    plt.tight_layout()
    plt.savefig(output_img_path, format="png", bbox_inches="tight", dpi=300)
    plt.close()
    print(f"Architecture diagram successfully generated at: {output_img_path}")




def build_pdf(filename):
    SLIDE_WIDTH = 11 * inch
    SLIDE_HEIGHT = 6.1875 * inch
    
    # Generate visual architecture diagram PNG first
    img_dir = os.path.dirname(os.path.abspath(filename))
    arch_img_path = os.path.join(img_dir, "architecture_diagram.png")
    create_architecture_diagram(arch_img_path)

    doc = SimpleDocTemplate(
        filename,
        pagesize=(SLIDE_WIDTH, SLIDE_HEIGHT),
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.45 * inch
    )
    
    # Color Palette
    PRIMARY = colors.HexColor("#1b4332")     # Deep Forest Green
    ACCENT = colors.HexColor("#2d6a4f")      # Rich Green
    HIGHLIGHT = colors.HexColor("#52b788")   # Mint Accent
    BG_LIGHT = colors.HexColor("#f8fafc")    # Light Tint
    DARK_TEXT = colors.HexColor("#0f172a")   # Slate Charcoal
    MUTED_TEXT = colors.HexColor("#475569")  # Medium Gray
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    styles = getSampleStyleSheet()
    
    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=1,
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=17,
        textColor=ACCENT,
        alignment=1,
        spaceAfter=14
    )
    
    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=DARK_TEXT,
        alignment=1
    )
    
    slide_title_style = ParagraphStyle(
        'SlideTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=20,
        textColor=PRIMARY,
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        'SlideBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=DARK_TEXT,
        spaceAfter=6,
        leftIndent=12
    )

    bullet_bold_style = ParagraphStyle(
        'SlideBulletBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=15,
        textColor=PRIMARY,
        spaceAfter=6,
        leftIndent=12
    )
    
    abstract_style = ParagraphStyle(
        'AbstractText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=DARK_TEXT,
        spaceAfter=8,
        alignment=4
    )
    
    table_hdr_style = ParagraphStyle(
        'TableHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.2,
        textColor=DARK_TEXT
    )

    story = []

    def draw_slide_decorations(canvas, document):
        canvas.saveState()
        page_num = document.page
        total_pages = 15
        
        if page_num == 1:
            # Cover header banner
            canvas.setFillColor(PRIMARY)
            canvas.rect(0, SLIDE_HEIGHT - 0.4 * inch, SLIDE_WIDTH, 0.4 * inch, stroke=0, fill=1)
            canvas.setFillColor(HIGHLIGHT)
            canvas.rect(0, SLIDE_HEIGHT - 0.45 * inch, SLIDE_WIDTH, 0.05 * inch, stroke=0, fill=1)
            
            # Bottom footer banner
            canvas.setFillColor(PRIMARY)
            canvas.rect(0, 0, SLIDE_WIDTH, 0.3 * inch, stroke=0, fill=1)
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 8.5)
            canvas.drawString(0.4 * inch, 0.09 * inch, "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING | MAJOR PROJECT PRESENTATION 2025-26")
        else:
            # Top Banner
            canvas.setFillColor(PRIMARY)
            canvas.rect(0, SLIDE_HEIGHT - 0.35 * inch, SLIDE_WIDTH, 0.35 * inch, stroke=0, fill=1)
            canvas.setFillColor(HIGHLIGHT)
            canvas.rect(0, SLIDE_HEIGHT - 0.38 * inch, SLIDE_WIDTH, 0.03 * inch, stroke=0, fill=1)
            
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 9.5)
            canvas.drawString(0.4 * inch, SLIDE_HEIGHT - 0.24 * inch, "KrishiMitraAI — Offline Agentic AI Platform for Precision Agriculture")
            
            # Subtitle banner
            canvas.drawRightString(SLIDE_WIDTH - 0.4 * inch, SLIDE_HEIGHT - 0.24 * inch, "Major Project Presentation")

            # Footer Line
            canvas.setStrokeColor(BORDER_COLOR)
            canvas.setLineWidth(0.75)
            canvas.line(0.4 * inch, 0.35 * inch, SLIDE_WIDTH - 0.4 * inch, 0.35 * inch)
            
            # Footer text & Slide Number (Exact 15-Slide Sequence)
            canvas.setFillColor(MUTED_TEXT)
            canvas.setFont("Helvetica", 8.5)
            canvas.drawString(0.4 * inch, 0.16 * inch, "Department of Computer Science & Engineering, NCE Hassan")
            canvas.drawRightString(SLIDE_WIDTH - 0.4 * inch, 0.16 * inch, f"Slide {page_num} of {total_pages}")
            
        canvas.restoreState()

    # SLIDE 1: Title of the project, Student Name, USN, Guide Name, Department/College Name
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph("<b>KrishiMitraAI</b>", title_style))
    story.append(Paragraph("Offline-First Agentic AI Platform for Precision Agriculture & Crop Advisory", subtitle_style))
    story.append(HRFlowable(width="60%", thickness=2, color=HIGHLIGHT, spaceAfter=16))
    
    meta_text = """
    <b>Presented By:</b> [Student Name] &nbsp;&nbsp;|&nbsp;&nbsp; <b>USN:</b> [USN Number]<br/><br/>
    <b>Under the Guidance of:</b> [Guide Name], Assistant Professor / Associate Professor<br/><br/>
    <b>Department & College:</b> Department of Computer Science & Engineering,<br/>
    NDRK Institute of Technology / NCE Hassan
    """
    story.append(Paragraph(meta_text, meta_style))
    story.append(PageBreak())

    # SLIDE 2: Abstract / Brief Summary (150–300 words summarizing the complete work)
    story.append(Paragraph("Slide 2: Abstract & Executive Summary", slide_title_style))
    abs_p1 = """
    <b>KrishiMitraAI</b> is an offline-first, agentic artificial intelligence platform designed to empower smallholder Indian farmers with personalized, accessible, and explainable precision agriculture guidance directly in remote field environments. Traditional digital agricultural advisory solutions depend heavily on cloud infrastructure, continuous high-speed internet (3G/4G/5G), complex visual user interfaces, and opaque predictions. KrishiMitraAI overcomes these systemic barriers through an edge-native hybrid architecture that combines lightweight on-device machine learning with local Retrieval-Augmented Generation (RAG) and Vision-Language Models (LLaVA).
    """
    abs_p2 = """
    The system seamlessly integrates lightweight Convolutional Neural Networks (CNNs) for instant crop leaf disease diagnosis, XGBoost with SHAP (SHapley Additive exPlanations) for transparent soil-to-crop recommendation, and local Ollama LLMs (LLaMA 3.1) grounded in verified domain knowledge from ICAR and KVK agricultural handbooks. To bridge literacy and language gaps, hands-free voice interaction in regional Indian languages (Kannada and Hindi) is provided via OpenAI Whisper. Delivered as a Progressive Web Application (PWA) with ONNX Runtime Web, KrishiMitraAI ensures sub-150ms offline inference latency with zero internet dependency, providing reliable agricultural intelligence at the farm level.
    """
    story.append(Paragraph(abs_p1, abstract_style))
    story.append(Paragraph(abs_p2, abstract_style))
    story.append(PageBreak())

    # SLIDE 3: Introduction & Background (Part 1 - Context & Challenges)
    story.append(Paragraph("Slide 3: Introduction & Background (Context)", slide_title_style))
    story.append(Paragraph("<b>1. Rural Digital Divide:</b> Over 65% of smallholder Indian farmers operate in regions with unreliable or non-existent 3G/4G connectivity, rendering standard cloud-based AI tools unusable in remote fields.", bullet_style))
    story.append(Paragraph("<b>2. Severe Crop Yield Losses:</b> Pest infestations and unmanaged plant leaf diseases cause an estimated annual agricultural yield loss of 20–30% due to delayed diagnosis and incorrect treatment.", bullet_style))
    story.append(Paragraph("<b>3. Linguistic & Technical Usability Barriers:</b> Most existing agri-tech platforms operate exclusively in English with complex text-heavy forms, posing major usability challenges for rural farmers.", bullet_style))
    story.append(Paragraph("<b>4. Lack of AI Transparency & Trust:</b> Traditional 'black-box' advisory models fail to gain farmer trust because they do not explain <i>why</i> a specific fertilizer, soil amendment, or crop is advised.", bullet_style))
    story.append(PageBreak())

    # SLIDE 4: Introduction & Background (Part 2 - Modern AI & Precision Farming Solutions)
    story.append(Paragraph("Slide 4: Modern AI Innovations for Precision Agriculture", slide_title_style))
    story.append(Paragraph("<b>1. Offline Edge Machine Learning:</b> Executing AI models locally on edge devices (smartphones/PWAs via WebAssembly & ONNX Runtime) delivers zero-latency, continuous field availability.", bullet_style))
    story.append(Paragraph("<b>2. Agentic Retrieval-Augmented Generation (RAG):</b> Grounding Large Language Models in verified ICAR (Indian Council of Agricultural Research) documents prevents AI hallucinations.", bullet_style))
    story.append(Paragraph("<b>3. Multilingual Multimodal AI:</b> Integrating speech-to-text (Whisper) with Computer Vision (LLaVA/ResNet) enables farmers to interact via natural speech and leaf photographs.", bullet_style))
    story.append(Paragraph("<b>4. Explainable AI (XAI) Integration:</b> Utilizing SHAP values and feature attribution charts builds farmer trust by visually demonstrating exact soil-yield drivers.", bullet_style))
    story.append(PageBreak())

    # SLIDE 5: Problem Statement and Project Objectives
    story.append(Paragraph("Slide 5: Problem Statement & Key Project Objectives", slide_title_style))
    story.append(Paragraph("<b>Problem Statement:</b>", bullet_bold_style))
    story.append(Paragraph("<i>“Smallholder Indian farmers suffer severe crop yield losses due to internet connectivity dependence, lack of localized language support, delayed leaf disease identification, and non-transparent 'black-box' advisory tools.”</i>", bullet_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Key Project Objectives:</b>", bullet_bold_style))
    story.append(Paragraph("<b>1. Offline-First Access:</b> Engineer a PWA running ONNX Runtime Web capable of instant crop recommendation without active internet connectivity.", bullet_style))
    story.append(Paragraph("<b>2. Multimodal Leaf Pathology:</b> Combine custom CNN image classification with LLaVA vision model for accurate disease identification and treatment tips.", bullet_style))
    story.append(Paragraph("<b>3. Localized Voice RAG Assistant:</b> Build a Kannada/Hindi voice-enabled conversational assistant powered by local Ollama LLaMA 3.1 and ChromaDB.", bullet_style))
    story.append(Paragraph("<b>4. Transparent XAI Insights:</b> Incorporate SHAP explainability to highlight N-P-K soil contributions and disease feature attribution.", bullet_style))
    story.append(PageBreak())

    # SLIDE 6: Literature Survey (SUMMARY TABLE OF BASE IEEE PAPERS - DECREASING CHRONOLOGICAL ORDER)
    story.append(Paragraph("Slide 6: Literature Survey (IEEE Publications - Decreasing Chronological Order)", slide_title_style))
    
    # 5 Columns: Paper/Author, Methodology/Approach, Key Strengths, Limitations/Inferences, KrishiMitra Enhancement
    lit_data = [
        [
            Paragraph("<b>Paper / Author</b>", table_hdr_style),
            Paragraph("<b>Methodology / Approach</b>", table_hdr_style),
            Paragraph("<b>Key Strengths</b>", table_hdr_style),
            Paragraph("<b>Limitations / Inferences</b>", table_hdr_style),
            Paragraph("<b>KrishiMitra Enhancement</b>", table_hdr_style)
        ],
        [
            Paragraph("<b>A. Kumar & R. Sen (2024)</b><br/><i>IEEE Trans. Comput. Soc. Syst.</i><br/>RAG for Agricultural QA", table_cell_style),
            Paragraph("Retrieval-Augmented Generation (RAG) with dense retrieval & LLM for agri QA.", table_cell_style),
            Paragraph("High domain accuracy for contextual agricultural question answering.", table_cell_style),
            Paragraph("Relies on active cloud LLM server APIs; lacks offline regional speech input.", table_cell_style),
            Paragraph("Integrates 100% offline local Ollama LLaMA 3.1 & Whisper STT for Kannada/Hindi voice RAG.", table_cell_style)
        ],
        [
            Paragraph("<b>S. Patel & H. Shah (2024)</b><br/><i>IEEE Trans. Knowl. Data Eng.</i><br/>KAG using Graph DBs for Advisory", table_cell_style),
            Paragraph("Knowledge-Augmented Generation (KAG) leveraging Neo4j Graph DBs for crop decisions.", table_cell_style),
            Paragraph("Structured entity relationship modeling for crops, pests, and soil nutrients.", table_cell_style),
            Paragraph("High memory overhead for complex graph traversal on low-resource edge nodes.", table_cell_style),
            Paragraph("Combines Neo4j graph schemas with lightweight ChromaDB vector embeddings for hybrid retrieval.", table_cell_style)
        ],
        [
            Paragraph("<b>M. Zhang & L. Wang (2023)</b><br/><i>IEEE Access</i><br/>Multimodal Sensor Fusion & On-Device CNNs", table_cell_style),
            Paragraph("On-Device CNNs + Multimodal Sensor Fusion for real-time leaf pathogen diagnosis.", table_cell_style),
            Paragraph("High diagnostic accuracy for real-time plant disease detection in field tests.", table_cell_style),
            Paragraph("Tabular sensor output without natural language explanations or treatment tips.", table_cell_style),
            Paragraph("Pairs PyTorch CNN leaf disease classification with LLaVA vision model for conversational advice.", table_cell_style)
        ],
        [
            Paragraph("<b>J. Rodriguez & P. Chen (2023)</b><br/><i>IEEE IoT Journal</i><br/>LLM Quantization on Edge Gateways", table_cell_style),
            Paragraph("INT4/FP16 LLM Model Quantization & deployment on low-resource edge hardware.", table_cell_style),
            Paragraph("Significantly reduces LLM memory footprint for edge gateway execution.", table_cell_style),
            Paragraph("Requires dedicated edge gateway server; lacks browser PWA edge integration.", table_cell_style),
            Paragraph("Implements ONNX Runtime Web inside PWA service worker for sub-150ms zero-latency execution.", table_cell_style)
        ]
    ]
    
    col_widths = [1.8*inch, 2.0*inch, 1.9*inch, 2.2*inch, 2.3*inch]
    t_lit = Table(lit_data, colWidths=col_widths)
    t_lit.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_lit)
    story.append(PageBreak())

    # SLIDE 7: Proposed Methodology / System Architecture (NEAT VISUAL DIAGRAM)
    story.append(Paragraph("Slide 7: Proposed Methodology & System Architecture", slide_title_style))
    story.append(Paragraph("The system is structured into four distinct modular tiers ensuring offline operation, high explainability, and multi-lingual voice interactivity:", ParagraphStyle('SubText', parent=styles['Normal'], fontSize=9, leading=12, textColor=MUTED_TEXT, spaceAfter=6)))
    
    # Insert visual architecture diagram image
    if os.path.exists(arch_img_path):
        story.append(Image(arch_img_path, width=10.2*inch, height=4.3*inch))
    else:
        story.append(Paragraph("<i>Architecture Diagram Image Not Available</i>", bullet_style))
    
    story.append(PageBreak())

    # SLIDE 8: Block Diagrams / Flowcharts / Workflow
    story.append(Paragraph("Slide 8: Workflow & End-to-End Execution Pipeline", slide_title_style))
    story.append(Paragraph("<b>1. Regional Voice & Multilingual Input Pipeline:</b><br/>"
                           "• Farmer speaks query in Kannada/Hindi → OpenAI Whisper transcribes audio to text → Text converted to vector embeddings.", bullet_style))
    story.append(Paragraph("<b>2. Local RAG Retrieval & Knowledge Synthesis:</b><br/>"
                           "• Vector embeddings search ChromaDB vector store containing ICAR/KVK guides → Relevant context passed to local Ollama LLaMA 3.1.", bullet_style))
    story.append(Paragraph("<b>3. Vision Pathology & Disease Diagnostic Flow:</b><br/>"
                           "• Leaf photo uploaded → PyTorch ResNet CNN classifies disease → LLaVA generates contextual organic remediation advice.", bullet_style))
    story.append(Paragraph("<b>4. Edge Model Inference & SHAP Explainability:</b><br/>"
                           "• Soil inputs (N, P, K, pH, rainfall) evaluated on-device via ONNX XGBoost model → SHAP plots top yield drivers.", bullet_style))
    story.append(PageBreak())

    # SLIDE 9: Hardware and Software Requirements / Tools Used
    story.append(Paragraph("Slide 9: Hardware & Software Requirements / Tools Used", slide_title_style))
    
    hw_sw_data = [
        [Paragraph("<b>Category</b>", table_hdr_style), Paragraph("<b>Technologies & Tools</b>", table_hdr_style), Paragraph("<b>Role / Purpose in KrishiMitraAI</b>", table_hdr_style)],
        [Paragraph("Frontend Stack", table_cell_style), Paragraph("React 18, Vite PWA, TailwindCSS, Recharts", table_cell_style), Paragraph("Offline Progressive Web Application with dynamic chart rendering", table_cell_style)],
        [Paragraph("API Gateway", table_cell_style), Paragraph("Node.js, Express.js, JWT, IndexedDB Queue", table_cell_style), Paragraph("Session authentication, API routing, and offline sync manager", table_cell_style)],
        [Paragraph("ML & AI Engines", table_cell_style), Paragraph("Python 3.10, FastAPI, PyTorch, ONNX Runtime, XGBoost", table_cell_style), Paragraph("Crop leaf disease classification, soil crop advisory, edge quantization", table_cell_style)],
        [Paragraph("LLM & Multimodal Core", table_cell_style), Paragraph("Ollama (LLaMA 3.1 8B, LLaVA 7B), Whisper STT", table_cell_style), Paragraph("Local conversational RAG agent, image breakdown, regional speech STT", table_cell_style)],
        [Paragraph("Knowledge Storage", table_cell_style), Paragraph("ChromaDB, MongoDB, SQLite, ICAR Handbooks", table_cell_style), Paragraph("Vector embedding store for semantic search and offline user data storage", table_cell_style)],
        [Paragraph("Hardware Specs", table_cell_style), Paragraph("<b>Server/Dev:</b> Intel i7/Ryzen 7, 16GB RAM, RTX GPU<br/><b>Client:</b> Smartphone or Edge PC", table_cell_style), Paragraph("Model training, local Ollama execution, and client edge web hosting", table_cell_style)]
    ]
    
    t_hw = Table(hw_sw_data, colWidths=[1.8*inch, 4.2*inch, 4.2*inch])
    t_hw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_hw)
    story.append(PageBreak())

    # SLIDE 10: Implementation / Snapshots / Experimental Setup (Part 1)
    story.append(Paragraph("Slide 10: Implementation & Setup — Core AI Engine", slide_title_style))
    story.append(Paragraph("<b>1. Offline ONNX Model Quantization:</b> Trained PyTorch CNN & XGBoost models converted to ONNX format with FP16 quantization for direct execution inside web browsers via WebAssembly.", bullet_style))
    story.append(Paragraph("<b>2. Knowledge Base Vector Indexing:</b> Ingested over 1,500+ ICAR & KVK agricultural handbook pages into ChromaDB vector database using `all-MiniLM-L6-v2` embeddings.", bullet_style))
    story.append(Paragraph("<b>3. Multimodal Pathology Integration:</b> Developed custom CNN trained on 50,000+ plant leaf images (38 categories), paired with LLaVA vision transformer for conversational follow-ups.", bullet_style))
    story.append(Paragraph("<b>4. Local LLM Orchestration via Ollama:</b> Configured REST client connecting FastAPI backend to local Ollama server, enforcing structured JSON schemas for consistent output.", bullet_style))
    story.append(PageBreak())

    # SLIDE 11: Implementation / Snapshots / Experimental Setup (Part 2)
    story.append(Paragraph("Slide 11: Implementation & Setup — Interface & Integration", slide_title_style))
    story.append(Paragraph("<b>1. Kannada & Hindi Voice Navigation:</b> Integrated web audio recorder streaming audio chunks to Whisper STT, enabling hands-free operation in farm fields.", bullet_style))
    story.append(Paragraph("<b>2. Interactive SHAP Explainability Dashboard:</b> Rendered dynamic horizontal bar charts showing exact soil factor contributions (e.g., Nitrogen +32%, Rainfall +24%) for crop suitability.", bullet_style))
    story.append(Paragraph("<b>3. Real-Time Mandi Price Sync:</b> Configured AgMarkNet price feed sync to display live crop market prices whenever internet connectivity is detected.", bullet_style))
    story.append(Paragraph("<b>4. Containerized Microservices Deployment:</b> Orchestrated Node Gateway, Python FastAPI ML service, ChromaDB, and MongoDB using Docker Compose.", bullet_style))
    story.append(PageBreak())

    # SLIDE 12: Results, Graphs, or Performance Analysis
    story.append(Paragraph("Slide 12: Results & Performance Evaluation", slide_title_style))
    story.append(Paragraph("<b>1. High Disease Detection Accuracy:</b> PyTorch CNN leaf disease model achieved <b>95.4% test accuracy</b> across 14 major crop species and 38 disease classes.", bullet_style))
    story.append(Paragraph("<b>2. Precise Crop Recommendation:</b> XGBoost crop recommendation model attained an overall <b>98.2% F1-score</b> on multi-class crop selection using N-P-K soil parameters.", bullet_style))
    story.append(Paragraph("<b>3. Sub-150ms Offline Edge Latency:</b> Local browser inference via ONNX Runtime Web executed in <b>< 150ms</b>, requiring 0 KB internet bandwidth.", bullet_style))
    story.append(Paragraph("<b>4. Efficient Local RAG Retrieval:</b> Vector similarity search in ChromaDB delivered context chunks in <b>< 1.2 seconds</b> on standard PC hardware with zero external API costs.", bullet_style))
    story.append(PageBreak())

    # SLIDE 13: Conclusion and Future Scope
    story.append(Paragraph("Slide 13: Conclusion & Future Scope", slide_title_style))
    story.append(Paragraph("<b>Conclusion:</b>", bullet_bold_style))
    story.append(Paragraph("• KrishiMitraAI successfully addresses internet dependency, language barriers, and non-transparent advisory systems in rural Indian agriculture.<br/>"
                           "• Combines edge machine learning, local RAG LLMs, and regional voice interaction into a single offline-first solution.", bullet_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Future Scope:</b>", bullet_bold_style))
    story.append(Paragraph("<b>1. Bluetooth IoT Soil Sensors:</b> Integrate direct BLE hardware connection with N-P-K soil sensors for automated telemetry.", bullet_style))
    story.append(Paragraph("<b>2. Drone Imagery Analytics:</b> Extend PyTorch CNN model to process farm-scale drone multispectral images for early pest mapping.", bullet_style))
    story.append(Paragraph("<b>3. Expanded Vernacular Dialects:</b> Fine-tune speech models for Telugu, Tamil, Marathi, and regional agricultural dialects.", bullet_style))
    story.append(PageBreak())

    # SLIDE 14: References (IEEE Standard - Decreasing Chronological Order)
    story.append(Paragraph("Slide 14: References (IEEE Standard - Decreasing Chronological Order)", slide_title_style))
    
    ref_style = ParagraphStyle(
        'IEEERefText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.2,
        leading=14.5,
        textColor=DARK_TEXT,
        spaceAfter=9,
        leftIndent=20,
        firstLineIndent=-20
    )
    
    refs = [
        "[1] A. Kumar and R. Sen, “Retrieval-Augmented Generation (RAG) for Contextual Agricultural Question Answering Systems,” <i>IEEE Transactions on Computational Social Systems</i>, vol. 11, no. 2, pp. 1420–1432, 2024.",
        "[2] S. Patel and H. Shah, “Knowledge-Augmented Generation (KAG) using Graph Databases for Agricultural Advisory Decision Systems,” <i>IEEE Transactions on Knowledge and Data Engineering</i>, vol. 36, no. 5, pp. 2410–2422, 2024.",
        "[3] M. Zhang and L. Wang, “Multimodal Sensor Fusion and On-Device Convolutional Neural Networks for Real-Time Leaf Pathogen Diagnosis,” <i>IEEE Access</i>, vol. 11, pp. 89201–89215, 2023.",
        "[4] J. Rodriguez and P. Chen, “Quantization and Deployment of Large Language Models on Low-Resource Edge Gateways for Precision Farming,” <i>IEEE Internet of Things Journal</i>, vol. 10, no. 18, pp. 16540–16551, 2023."
    ]
    
    for r in refs:
        story.append(Paragraph(r, ref_style))
        
    story.append(PageBreak())

    # SLIDE 15: Thank You / Q&A
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("<b>Thank You!</b>", title_style))
    story.append(Paragraph("Questions & Discussion", subtitle_style))
    story.append(HRFlowable(width="50%", thickness=2, color=HIGHLIGHT, spaceAfter=20))
    
    ty_text = """
    <b>KrishiMitraAI Project Team</b><br/><br/>
    Department of Computer Science & Engineering<br/>
    NDRK Institute of Technology / NCE Hassan<br/><br/>
    <i>“Empowering Farmers with Accessible, Offline, & Transparent AI”</i>
    """
    story.append(Paragraph(ty_text, meta_style))

    doc.build(story, onFirstPage=draw_slide_decorations, onLaterPages=draw_slide_decorations)
    print(f"Presentation PDF successfully generated at: {filename}")


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generate presentation.pdf (as requested by user)
    target_presentation = os.path.join(out_dir, "presentation.pdf")
    build_pdf(target_presentation)
    
    # Also update KrishiMitra_AI_Presentation.pdf for full compatibility
    target_krishimitra = os.path.join(out_dir, "KrishiMitra_AI_Presentation.pdf")
    build_pdf(target_krishimitra)
