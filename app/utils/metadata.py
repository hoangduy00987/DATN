def sanitize_metadata(data: dict):
    clean = {}
    for key, value in (data or {}).items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            clean[key] = value
        else:
            clean[key] = str(value)
    return clean