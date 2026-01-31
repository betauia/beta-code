FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ ca-certificates coreutils \
 && rm -rf /var/lib/apt/lists/*

# Copy runner script as root and make it executable
COPY run.sh /usr/local/bin/run.sh
RUN chmod 755 /usr/local/bin/run.sh

# Create non-root user and drop privileges
RUN useradd -m runner
USER runner

WORKDIR /sandbox
ENTRYPOINT ["/usr/local/bin/run.sh"]
