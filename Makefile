.PHONY: run compile test

run:
	uvicorn router.main:app --reload

compile:
	python -m compileall router shared display admin

test:
	python -m pytest
