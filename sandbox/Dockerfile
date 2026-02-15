FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ ca-certificates coreutils \
 && rm -rf /var/lib/apt/lists/*

# Precompile C++ standard headers so per-submission compilation is faster.
# This creates a .gch file that g++ will automatically pick up when the same
# header is #included with matching flags (-std=c++20 -O2).
COPY pch.hpp /usr/local/include/pch.hpp
RUN g++ -std=c++20 -O2 -x c++-header /usr/local/include/pch.hpp -o /usr/local/include/pch.hpp.gch
 

# Copy runner script as root and make it executable
COPY run.sh /usr/local/bin/run.sh
RUN sed -i 's/\r$//' /usr/local/bin/run.sh && chmod 755 /usr/local/bin/run.sh

# Create non-root user and drop privileges
RUN useradd -m runner
USER runner

WORKDIR /sandbox
ENTRYPOINT ["/usr/local/bin/run.sh"]
