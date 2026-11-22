import os
import subprocess

from app.config import DATA_DIR, STRUCTURED_JSON_DIR

INPUT_DIR = DATA_DIR / "scraped"
OUTPUT_DIR = STRUCTURED_JSON_DIR


SYSTEM_INSTRUCTION = """
You are a strict data parsing agent for BranchWise. Your job is to convert unstructured college markdown data into a valid JSON object.
You must adhere strictly to the following keys and data types. 

Handling Missing Data:
- If a data point is marked as "NOT_FOUND", "NOT_FOUND_SEPARATELY", or "NOT_APPLICABLE", convert it to `null` (for numbers) or an empty array `[]` (for lists).

Expected JSON Schema:
{
  "college_name": "Full Name of the College",
  "nirf_engineering_rank": <integer or null>,
  "overall_median_ctc_lpa": <float or null>,
  "overall_placement_percentage": <float or null>,
  "cse_core_subjects": ["Subject 1", "Subject 2"],
  "ee_core_subjects": ["Subject 1", "Subject 2"],
  "sports_infrastructure": ["Facility 1", "Facility 2"],
  "student_clubs": ["Club 1", "Club 2"],
  "incubation_center_name": "Name of incubator or null",
  "notable_startups": ["Startup 1", "Startup 2"]
}

CRITICAL: Return ONLY the raw JSON block. Do not include any conversational text. 
"""


def clean_json_output(raw_output):
    cleaned = raw_output.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def output_dir_for(filename: str):
    stem = filename.replace("_raw.txt", "")
    if stem.startswith("IIT_"):
        return OUTPUT_DIR / "iit"
    if stem.startswith("IIIT"):
        return OUTPUT_DIR / "i3t"
    if stem.startswith(("NIT", "MNIT", "MNNIT", "MANIT", "VNIT", "SVNIT")):
        return OUTPUT_DIR / "nit"
    return OUTPUT_DIR


def process_file(filename):
    input_path = INPUT_DIR / filename
    json_filename = filename.replace("_raw.txt", ".json")
    target_dir = output_dir_for(filename)
    os.makedirs(target_dir, exist_ok=True)
    output_path = target_dir / json_filename

    if output_path.exists():
        print(f"Skipping {filename}, JSON already exists.")
        return

    print(f"Parsing {filename} into JSON...")

    with open(input_path, "r", encoding="utf-8") as f:
        raw_content = f.read()

    full_prompt = f"{SYSTEM_INSTRUCTION}\n\nRAW DATA TO PARSE:\n{raw_content}"

    try:
        process = subprocess.Popen(
            ['gemini'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate(input=full_prompt)

        if process.returncode == 0 and stdout.strip():
            final_json = clean_json_output(stdout)

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(final_json)

            print(f"Successfully created {output_path}")
        else:
            print(f"CLI Error on {filename}: {stderr}")

    except Exception as e:
        print(f"Failed executing CLI for {filename}: {str(e)}")


def main():
    print(f"Scanning {INPUT_DIR} for raw text files")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files_to_process = [f for f in os.listdir(INPUT_DIR) if f.endswith("_raw.txt")]

    if not files_to_process:
        print("No raw text files found. Make sure your Playwright script has run first.")
        return

    for file in files_to_process:
        process_file(file)

    print("All files serialized successfully!")


if __name__ == "__main__":
    main()
