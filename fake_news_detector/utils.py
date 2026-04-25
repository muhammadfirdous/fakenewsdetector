import re

def detect_red_flags(title: str, text: str, authors: list):
    flags = []
    
    # 1. Clickbait Patterns
    clickbait_regex = [
        r"you won['’]t believe",
        r"shocking",
        r"revealed",
        r"stop what you['’]re doing",
        r"this one trick",
        r"experts hate",
        r"\?\?!"
    ]
    
    combined_content = (title + " " + text).lower()
    for pattern in clickbait_regex:
        if re.search(pattern, combined_content):
            flags.append(f"Clickbait pattern detected: '{pattern}'")
            break # Just one flag for clickbait
            
    # 2. ALL CAPS usage (in title usually)
    if title and title.isupper() and len(title) > 10:
        flags.append("ALL CAPS headline detected")
        
    # 3. Excessive Punctuation
    if "!!!" in title or "???" in title or "!!!" in text or "???" in text:
        flags.append("Excessive punctuation (!!! or ???) detected")
        
    # 4. Lack of Author Attribution
    if not authors or (len(authors) == 1 and authors[0].lower() in ["admin", "staff", "news"]):
        flags.append("Lack of specific author attribution")
        
    # 5. Emotional Exaggeration
    emotional_words = ["terrible", "horrific", "unbelievable", "amazing", "disaster", "miracle"]
    emotional_count = sum(1 for word in emotional_words if word in combined_content)
    if emotional_count >= 3:
        flags.append("Emotionally loaded language detected")

    return flags
