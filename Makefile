.PHONY: run compile test release release-dry

run:
	uvicorn router.main:app --reload

compile:
	python -m compileall router shared display admin

test:
	python -m pytest

release:
	@echo "Usage: make release VERSION=x.y.z"
	@if [ -z "$$VERSION" ]; then echo "VERSION is required"; exit 1; fi
	@if [ -n "$$(git status --porcelain)" ]; then echo "Working tree not clean"; exit 1; fi
	@if git rev-parse "v$$VERSION" >/dev/null 2>&1; then echo "Tag v$$VERSION already exists"; exit 1; fi
	git tag -a v$$VERSION -m "v$$VERSION"
	git push origin v$$VERSION

release-dry:
	@echo "Usage: make release-dry VERSION=x.y.z"
	@if [ -z "$$VERSION" ]; then echo "VERSION is required"; exit 1; fi
	@if [ -n "$$(git status --porcelain)" ]; then echo "Working tree not clean"; exit 1; fi
	@if git rev-parse "v$$VERSION" >/dev/null 2>&1; then echo "Tag v$$VERSION already exists"; exit 1; fi
	@echo "Would tag and push: v$$VERSION"
