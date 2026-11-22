from pathlib import Path

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

DEFAULT_OUTPUT = Path(__file__).resolve().parent / "proposal.docx"

def create_proposal_document(filename=DEFAULT_OUTPUT):
    doc = docx.Document()
    
    # Page setup - A4 with 0.45" top/bottom and 0.6" left/right margins to guarantee strict 2-page fit
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.42)
        section.bottom_margin = Inches(0.42)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
        
    NAVY = RGBColor(0x1F, 0x4E, 0x79)
    GRAY = RGBColor(0x55, 0x55, 0x55)
    DARK = RGBColor(0x22, 0x22, 0x22)
    BLACK = RGBColor(0x00, 0x00, 0x00)
    
    def set_font(run, name='Calibri', size_pt=9.5, bold=False, italic=False, color=BLACK):
        run.font.name = name
        run.font.size = Pt(size_pt)
        run.bold = bold
        run.italic = italic
        run.font.color.rgb = color
        
    def add_heading(text, space_before=4, space_after=1.5):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.02
        run = p.add_run(text)
        set_font(run, 'Calibri', 12, bold=True, color=NAVY)
        return p

    def add_labeled_paragraph(label, body, word_count_label="(100 words or less): ", space_after=2):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0.5)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.04
        
        r1 = p.add_run(label + " ")
        set_font(r1, 'Calibri', 9, bold=True, color=BLACK)
        
        if word_count_label:
            r_wc = p.add_run(word_count_label)
            set_font(r_wc, 'Calibri', 8, italic=True, color=GRAY)
            
        r2 = p.add_run(body)
        set_font(r2, 'Calibri', 9, bold=False, color=DARK)
        return p

    def style_table(table, col_widths, headers, data_rows, header_bg="F0F4F8"):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        # Format headers
        hdr_row = table.rows[0]
        for idx, text in enumerate(headers):
            cell = hdr_row.cells[idx]
            cell.width = Inches(col_widths[idx])
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{header_bg}"/>')
            cell._tc.get_or_add_tcPr().append(shd)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.0
            r = p.add_run(text)
            set_font(r, 'Calibri', 8.5, bold=True, color=BLACK)
            
        for row_data in data_rows:
            row = table.add_row()
            for idx, text in enumerate(row_data):
                cell = row.cells[idx]
                cell.width = Inches(col_widths[idx])
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT if idx != 0 else WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                p.paragraph_format.line_spacing = 1.0
                r = p.add_run(str(text))
                set_font(r, 'Calibri', 8.5, bold=(idx == 0 and len(row_data) == 3), color=DARK)

        # Set subtle border
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="B0C4DE"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="B0C4DE"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E0E8F0"/>'
            f'<w:insideV w:val="none"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    # ---------------- PAGE 1 ----------------
    top_note = doc.add_paragraph()
    top_note.paragraph_format.space_before = Pt(0)
    top_note.paragraph_format.space_after = Pt(2)
    top_note.paragraph_format.line_spacing = 1.0
    r_note = top_note.add_run(
        "This file must not exceed 2 pages. The (self-dev) base app and (cross-dev) plugin must be demo-ed in the same slot. "
        "Groups must agree on demo slot."
    )
    set_font(r_note, 'Calibri', 8, italic=True, color=GRAY)

    # Demo Slot Choice
    add_heading("Demo Slot Choice", space_before=2, space_after=1)
    tbl_slot = doc.add_table(rows=1, cols=3)
    slot_headers = ["", "Slot 1 (Thu Nov 26, 2026, 9PM)", "Slot 2 (Sat Nov 28, 2026, 9PM)"]
    slot_rows = [
        ["Self-dev Demo", "✓", ""],
        ["Cross-dev Demo", "", "✓"]
    ]
    style_table(tbl_slot, [2.1, 2.45, 2.45], slot_headers, slot_rows)

    # Project Team Details
    add_heading("Project Team Details", space_before=3.5, space_after=1)
    p_team = doc.add_paragraph()
    p_team.paragraph_format.space_before = Pt(0)
    p_team.paragraph_format.space_after = Pt(1)
    r_tname_lbl = p_team.add_run("Team Name: ")
    set_font(r_tname_lbl, 'Calibri', 9, bold=True, color=BLACK)
    r_tname = p_team.add_run("BranchWise Dynamics")
    set_font(r_tname, 'Calibri', 9, bold=False, color=DARK)

    p_members = doc.add_paragraph()
    p_members.paragraph_format.space_before = Pt(0)
    p_members.paragraph_format.space_after = Pt(1)
    r_mem_lbl = p_members.add_run("Team Members:")
    set_font(r_mem_lbl, 'Calibri', 8.5, bold=True, color=BLACK)

    tbl_team = doc.add_table(rows=1, cols=4)
    team_headers = ["SNo", "Name", "Roll No", "Email"]
    team_rows = [
        ["1", "Student 1", "26001", "student1@iitk.ac.in"],
        ["2", "Student 2", "26002", "student2@iitk.ac.in"],
        ["3", "Student 3", "26003", "student3@iitk.ac.in"],
        ["4", "Student 4", "26004", "student4@iitk.ac.in"]
    ]
    style_table(tbl_team, [0.55, 2.15, 1.3, 3.0], team_headers, team_rows)

    # Base Project Details
    add_heading("Base Project Details (self-dev portion)", space_before=4, space_after=1)
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(1.5)
    r_title_lbl = p_title.add_run("Project Title: ")
    set_font(r_title_lbl, 'Calibri', 9, bold=True, color=BLACK)
    r_title = p_title.add_run("BranchWise: AI-Powered JEE College Predictor & Counseling Assistant")
    set_font(r_title, 'Calibri', 9, bold=True, color=NAVY)

    add_labeled_paragraph(
        "Overall Project Description",
        "BranchWise is an intelligent web platform designed to guide engineering aspirants through JoSAA/CSAB counseling. "
        "It matches student JEE Main and Advanced ranks against official closing ranks across 80+ IITs, NITs, and IIITs. "
        "Beyond simple cutoff filtering, the platform utilizes hybrid retrieval-augmented generation (RAG) to recommend colleges and "
        "branches matching candidate preferences, such as placement CTCs, coding culture, startup incubation, research orientation, "
        "and home-state quotas. It dynamically generates adaptive questionnaires and produces personalized, exportable counseling choice lists."
    )

    add_labeled_paragraph(
        "ETL Component",
        "The ETL pipeline extracts, transforms, and loads official academic and campus data. A Playwright-based scraper "
        "(parallel_scraper.py) crawls official .ac.in portals and Wikipedia to extract NIRF rankings, TPO placement reports, core curricula, "
        "sports facilities, and incubators. Unstructured markdown is normalized via LLM parsing into standardized JSON schemas across 23 IITs, "
        "31 NITs, and 26 IIITs. Relational cutoff and college data are seeded into PostgreSQL (repopulate_db.py), while document generation scripts "
        "(plain_text.py) prepare clean textual corpora for vectorization."
    )

    add_labeled_paragraph(
        "AIML Component",
        "The AIML engine combines semantic vector search with heuristic ranking and generative AI. Text embeddings are generated using "
        "the BAAI/bge-small-en-v1.5 sentence transformer (384-dimensional dense vectors) and indexed in a Qdrant vector database for approximate "
        "nearest neighbor retrieval. A custom hybrid scoring function balances vector similarity with structured signals (NIRF rank, branch placement %, "
        "coding clubs, home-state advantage). Google Gemini 2.5 Flash is integrated to extract candidate preferences, dynamically generate follow-up "
        "clarifying questions, and formulate human-readable, multi-factor decision rationales."
    )

    add_labeled_paragraph(
        "VIZ Component",
        "The visual interface is a responsive Single Page Application built with React and Lucide icons. It features a modern dark-mode "
        "aesthetic with accessible color contrast and colorblind-friendly admission chance badges (Safe, Moderate, Ambitious). Key visualizations "
        "include comparative metric cards displaying average and median CTC (LPA), placement percentages, category cutoffs, and campus infrastructure tags. "
        "An interactive multi-step questionnaire wizard dynamically collects student preferences, while an analytics modal visualizes global system "
        "statistics such as category distributions and top-ranked colleges."
    )

    add_labeled_paragraph(
        "APP Component",
        "The application is architected as a microservices stack managed via Docker Compose. The backend runs on FastAPI (Python 3.11) "
        "with SQLAlchemy ORM, Uvicorn, and PostgreSQL 16 for persistence. Qdrant operates in a dedicated container handling vector indexing. "
        "The frontend is built with React 18 and Vite, served through an Nginx reverse proxy handling API routing (/api/) and gzip compression. "
        "The Docker setup incorporates BuildKit cache mounts and CPU-optimized PyTorch wheels for rapid, resilient offline deployment and build execution."
    )

    add_labeled_paragraph(
        "DEV Component",
        "The backend exposes modular RESTful endpoints (/predict, /recommend, /generate-questions, /colleges, /branches, /statistics, /export-choices) "
        "with JSON payloads and OpenAPI documentation at /docs. It includes local session authentication and a choice-list export utility delivering "
        "structured CSV files for direct JoSAA portal reference. Project team 'Melpoavin Makilchchi' will cross-dev an Academic Fee & Scholarship ROI "
        "Calculator plugin consuming our recommendations API, while our team will cross-dev a question template generator plugin for their base platform."
    )

    # ---------------- PAGE 2 ----------------
    doc.add_page_break()

    add_heading("Plugin Details (cross-dev portion)", space_before=2, space_after=2)

    p_plug_title = doc.add_paragraph()
    p_plug_title.paragraph_format.space_before = Pt(0)
    p_plug_title.paragraph_format.space_after = Pt(1.5)
    r_pt = p_plug_title.add_run("Plugin Title: ")
    set_font(r_pt, 'Calibri', 9, bold=True, color=BLACK)
    r_pt_val = p_plug_title.add_run("EduROI: Academic Fee, Scholarship & ROI Predictor Plugin")
    set_font(r_pt_val, 'Calibri', 9, bold=True, color=NAVY)

    def add_meta_line(label, value):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(1.5)
        r1 = p.add_run(label + " ")
        set_font(r1, 'Calibri', 9, bold=True, color=BLACK)
        r2 = p.add_run(value)
        set_font(r2, 'Calibri', 9, bold=False, color=DARK)

    add_meta_line("Base Project Title:", "Melpoavin Academic Management System")
    add_meta_line("Base Project Team Name:", "Melpoavin Makilchchi")
    add_meta_line("Base Project Team Members:", "Melbo (26010), Melba (26011), Melbro (26012), Melbae (26013), Melbruh (26014)")

    p_warn = doc.add_paragraph()
    p_warn.paragraph_format.space_before = Pt(2)
    p_warn.paragraph_format.space_after = Pt(3)
    r_warn = p_warn.add_run(
        "Note: your plugin will be judged against the features you commit below. Please do not overcommit and underdeliver as this will lead to loss of marks during final demo."
    )
    set_font(r_warn, 'Calibri', 8, italic=True, color=GRAY)

    add_labeled_paragraph(
        "Overall Plugin Description",
        "EduROI is a financial decision-support plugin that extends college recommendations by computing real-world Return on Investment (ROI). "
        "It maps recommended colleges and branches against 4-year tuition structures, hostel fees, and category-based scholarship waivers "
        "(e.g., full fee remission for SC/ST/low-income groups). The plugin estimates loan repayment timelines and net ROI by comparing total degree "
        "expenditure against verified median CTC placement data."
    )

    add_labeled_paragraph(
        "ETL Component",
        "The plugin extracts fee breakdowns and scholarship rules from official JoSAA fee structures, college portals, and national scholarship portals (NSP). "
        "Data is stored in SQLite tables linking institute IDs to tuition fees, mess/hostel deposits, income-bracket eligibility, and government tuition remission slabs."
    )

    add_labeled_paragraph(
        "AIML Component",
        "A regression model projects inflation-adjusted total cost of education and calculates financial risk scores. Monte Carlo simulations estimate expected "
        "payback periods based on placement distributions and baseline cost-of-living indices across tier-1, tier-2, and tier-3 college locations."
    )

    add_labeled_paragraph(
        "VIZ Component",
        "Provides visual financial breakdowns including interactive cost-vs-earnings timeline charts, monthly loan EMI estimation sliders, and scholarship "
        "eligibility comparison badges. Uses accessible, colorblind-friendly indicators to distinguish high-ROI versus high-debt options."
    )

    add_labeled_paragraph(
        "APP Component",
        "Implemented as a lightweight modular view that seamlessly integrates into the host application UI, connecting via internal hooks and querying the local "
        "SQLite financial store without external network dependencies."
    )

    add_labeled_paragraph(
        "DEV Component",
        "Interacts with the base application's recommendation output via published REST/function hooks. It accepts institute and category IDs, returning computed "
        "fee projections and ROI metrics in structured JSON format."
    )

    doc.save(filename)
    print(f"Saved {filename}")

if __name__ == "__main__":
    create_proposal_document()
