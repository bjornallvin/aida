# Dockerfile for Mopidy with Spotify and extensions
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-plugins-ugly \
        gstreamer1.0-libav \
        gstreamer1.0-tools \
        libglib2.0-0 \
        libspotify-dev \
        build-essential \
        curl \
        ca-certificates \
        && rm -rf /var/lib/apt/lists/*

# Install Mopidy and extensions
RUN pip install --no-cache-dir \
    mopidy==3.4.2 \
    mopidy-spotify==4.1.1 \
    mopidy-mpd \
    mopidy-local \
    mopidy-youtube \
    mopidy-soundcloud \
    mopidy-internetarchive

# Create a user for Mopidy
RUN useradd -m mopidy
USER mopidy
WORKDIR /home/mopidy

# Copy config and .env if present
COPY --chown=mopidy:mopidy mopidy.conf ./
COPY --chown=mopidy:mopidy .env .env

# Expose Mopidy ports
EXPOSE 6600 6680

# Start Mopidy
CMD [\"mopidy\", \"--config\", \"mopidy.conf\"]