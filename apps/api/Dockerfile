FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv

# Set to "allanime" only for the private, invite-only deployment.
ARG EXTRAS=""
WORKDIR /srv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project ${EXTRAS:+--extra $EXTRAS}
COPY . .
RUN uv sync --frozen --no-dev ${EXTRAS:+--extra $EXTRAS}

ENV PATH="/srv/.venv/bin:$PATH"
RUN useradd --system --no-create-home app \
    && mkdir -p /data/avatars && chown app /data/avatars
ENV AVATAR_DIR=/data/avatars
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
