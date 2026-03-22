from typing import Iterable, List, Tuple, TypeVar

from shared.schemas import ResponseMeta

T = TypeVar("T")


def paginate(items: List[T], page: int, page_size: int) -> Tuple[List[T], ResponseMeta]:
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    data = items[start:end]
    next_page = page + 1 if end < total else None
    prev_page = page - 1 if page > 1 else None
    meta = ResponseMeta(
        page=page,
        page_size=page_size,
        total=total,
        next_page=next_page,
        prev_page=prev_page,
    )
    return data, meta
