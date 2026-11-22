import json
import re
from functools import lru_cache

from .config import (
    GCP_LOCATION,
    GCP_PROJECT,
    GEMINI_API_KEY,
    LLM_MODEL,
    LLM_PROVIDER,
    OPENAI_API_KEY,
    OPENAI_API_MODE,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    USE_VERTEX,
)


def extract_json_from_text(text: str) -> str:
    # Try to find content within ```json ... ```
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Try to find content within ``` ... ```
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # If no code block, try to find the first '{' and last '}' or first '[' and last ']'
    bracket_match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if bracket_match:
        return bracket_match.group(1).strip()

    return text.strip()


@lru_cache(maxsize=1)
def _get_gemini_client():
    from google import genai

    if USE_VERTEX:
        if not GCP_PROJECT:
            raise RuntimeError("USE_VERTEX is enabled but GCP_PROJECT is not set.")
        return genai.Client(
            vertexai=True,
            project=GCP_PROJECT,
            location=GCP_LOCATION
        )

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "No Gemini credentials configured. Set GEMINI_API_KEY or enable USE_VERTEX with GCP_PROJECT."
        )

    return genai.Client(api_key=GEMINI_API_KEY)


@lru_cache(maxsize=1)
def _get_openai_client():
    from openai import OpenAI

    if not OPENAI_BASE_URL and not OPENAI_API_KEY:
        raise RuntimeError(
            "Set OPENAI_BASE_URL for a compatible endpoint, or OPENAI_API_KEY for api.openai.com."
        )

    kwargs = {"api_key": OPENAI_API_KEY or "not-needed"}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    return OpenAI(**kwargs)


def _generate(prompt: str) -> str:
    if LLM_PROVIDER in {"openai", "openai-compatible", "compatible"}:
        client = _get_openai_client()

        if OPENAI_API_MODE in {"responses", "response"}:
            response = client.responses.create(
                model=OPENAI_MODEL,
                input=prompt,
            )
            return response.output_text or ""

        if OPENAI_API_MODE in {"chat", "chat-completions", "completions"}:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content or ""

        raise RuntimeError(
            f"Unknown OPENAI_API_MODE '{OPENAI_API_MODE}'. Use 'chat' or 'responses'."
        )

    if LLM_PROVIDER in {"gemini", "google"}:
        response = _get_gemini_client().models.generate_content(
            model=LLM_MODEL,
            contents=prompt
        )
        return response.text

    raise RuntimeError(
        f"Unknown LLM_PROVIDER '{LLM_PROVIDER}'. Use 'gemini' or 'openai'."
    )


def generate_followup_questions(
    preferences: dict
):
    prompt = f"""
You are a college counselor.

Current extracted profile:

{json.dumps(preferences, indent=2)}

Generate between 5 and 10 follow-up questions.
ONLY ask about fields that are still unclear or set to false/empty in the profile.
Ensure that the final output has AT LEAST 5 questions and AT MOST 10 questions.
Keep the tone friendly and encouraging without being overly familiar.

For each follow-up question, instead of generic yes/no options, you MUST generate highly customized options tailored to the specific field/question.
Specifically, return a custom "yes_title" and "yes_desc" (representing the choice where the student cares about/prefers this option, setting the field to true) and a custom "no_title" and "no_desc" (representing the choice where the student does not care about/prefers not to prioritize this, keeping/setting the field to false).

Available fields to ask about:
- coding_culture
- startup_culture
- research
- placements
- campus_life
- hostel_quality
- sports
- extra_curriculars
- infrastructure
- diversity
- location_proximity
- branch_over_college (whether the student prioritizes branch/course choice over the college's brand/prestige)

Return JSON only as a list of objects.

Example:
[
  {{
    "field": "research",
    "question": "How important are research opportunities and projects to you?",
    "yes_title": "Yes, research is my passion",
    "yes_desc": "I want to publish papers and work on projects with professors.",
    "no_title": "No, not a major focus",
    "no_desc": "I want to prioritize placements and coding/industry skills instead."
  }},
  {{
    "field": "extra_curriculars",
    "question": "Are you interested in participating in student clubs and cultural festivals?",
    "yes_title": "Yes, I want active campus life",
    "yes_desc": "I'd love to join clubs, plan fests, and organize cultural activities.",
    "no_title": "No, I prefer peace",
    "no_desc": "I want to focus on my academics and avoid crowded events."
  }}
]
"""

    response = _generate(prompt)
    text = extract_json_from_text(response)
    return json.loads(text)


def extract_preferences(user_text: str,home_state: str):
    prompt = f"""
    You are a college recommendation assistant.

    Student home state:
    {home_state}

    Student preferences:
    {user_text}

    Return ONLY valid JSON.

    Schema:

    {{
    "preferred_states": [],
    "startup_culture": false,
    "coding_culture": false,
    "research": false,
    "placements": false,
    "campus_life": false,
    "hostel_quality": false,
    "sports": false,
    "extra_curriculars": false,
    "infrastructure": false,
    "diversity": false,
    "location_proximity": false,
    "branch_over_college": false,
    "vector_query": ""
    }}

    Rules:

    1. Infer nearby states if student prefers a college near home.

    2. vector_query must contain ONLY keywords and concepts.

    3. Do NOT generate sentences.

    4. Good example:

    startup ecosystem entrepreneurship incubation center
    coding culture hackathons competitive programming

    5. Bad example:

    I want a college with startup culture near Maharashtra.

    6. CRITICAL RULE: Set a boolean field (such as startup_culture, coding_culture, research, placements, campus_life, hostel_quality, sports, extra_curriculars, infrastructure, diversity, location_proximity, branch_over_college) to true ONLY if it is explicitly mentioned or directly requested in the student's preferences query. If a field is not explicitly mentioned, it MUST be set to false. Do not infer, assume, or extrapolate any preferences.

    7. CRITICAL RULE FOR BRANCH CATEGORIES: If the student specifies a specific branch group (e.g., "circuital branches", "circuital only", "cs only", etc.), do NOT expand it to include unrelated branch groups in vector_query. For example, if the student asks for "circuital branches", do NOT include "computer", "software", "IT", "cse", "cs" in the vector_query. Similarly, if they ask for "computer science" or "software", do NOT include circuital/electrical/electronics/mechanical keywords.
        """

    response = _generate(prompt)
    text = extract_json_from_text(response)
    return json.loads(text)


def generate_multiple_explanations(profile: dict, choices: list) -> dict:
    prompt = f"""
You are a friendly BranchWise college counselor who explains in a warm way.

Student preferences:
{json.dumps(profile, indent=2)}

Here are the top recommended options:
{json.dumps(choices, indent=2)}

For each option, write a very short explanation (exactly 1 or 2 short sentences, max 30-40 words) explaining why this choice matches the student's preferences.
CRITICAL: You MUST be extremely specific. Look at each choice's metadata (student_clubs, sports_infrastructure, startups, incubation_center) and mention specific ones by name (e.g. a specific club name, sports facility, or startup/incubator name) to prove why this college fits!
Keep the message crisp, short, and highly particular. Use 1 or 2 emojis.

Return the result as a JSON object mapping the "id" of the option (as a string, e.g. "0", "1", "2") to its explanation string.

Example:
{{
  "0": "This is a great match because... 🚀",
  "1": "This fits because... 🎨"
}}
"""
    response = _generate(prompt)
    text = extract_json_from_text(response)
    return json.loads(text)
