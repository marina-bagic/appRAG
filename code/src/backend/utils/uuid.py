import uuid
def is_uuid(id_str):
    try:
        uuid.UUID(str(id_str))
        return True
    except (ValueError, TypeError):
        return False