"""Utility functions for cleaning agricultural document text."""
import re


def clean_text(text: str) -> str:
    """Remove boilerplate, normalize whitespace, fix encoding artefacts."""
    # Fix common encoding issues
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "--")

    # Remove page numbers like "Page 12 of 45"
    text = re.sub(r"Page\s+\d+\s+of\s+\d+", "", text, flags=re.IGNORECASE)

    # Remove repeated hyphens/underscores (dividers)
    text = re.sub(r"[-_]{4,}", "", text)

    # Normalize multiple spaces and line breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_sections(text: str, section_patterns: list[str]) -> dict[str, str]:
    """
    Split a document into named sections based on heading patterns.
    Returns dict of {section_name: content}.
    """
    sections: dict[str, str] = {}
    current_section = "Introduction"
    current_content: list[str] = []

    for line in text.splitlines():
        matched = False
        for pattern in section_patterns:
            if re.match(pattern, line.strip(), re.IGNORECASE):
                if current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = line.strip()
                current_content = []
                matched = True
                break
        if not matched:
            current_content.append(line)

    if current_content:
        sections[current_section] = "\n".join(current_content).strip()

    return sections
