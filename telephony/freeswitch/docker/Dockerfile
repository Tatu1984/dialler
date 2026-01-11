# FreeSWITCH Docker Image for NexusDialer
FROM debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    gnupg2 \
    wget \
    curl \
    lsb-release \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add SignalWire repository for FreeSWITCH
RUN wget --http-user=signalwire --http-password=pat_abc123 -O /usr/share/keyrings/signalwire-freeswitch-repo.gpg https://freeswitch.signalwire.com/repo/deb/debian-release/signalwire-freeswitch-repo.gpg

RUN echo "deb [signed-by=/usr/share/keyrings/signalwire-freeswitch-repo.gpg] https://freeswitch.signalwire.com/repo/deb/debian-release/ `lsb_release -sc` main" > /etc/apt/sources.list.d/freeswitch.list

# Install FreeSWITCH
RUN apt-get update && apt-get install -y \
    freeswitch \
    freeswitch-conf-vanilla \
    freeswitch-mod-commands \
    freeswitch-mod-console \
    freeswitch-mod-sofia \
    freeswitch-mod-dptools \
    freeswitch-mod-dialplan-xml \
    freeswitch-mod-event-socket \
    freeswitch-mod-cdr-csv \
    freeswitch-mod-cdr-sqlite \
    freeswitch-mod-db \
    freeswitch-mod-hash \
    freeswitch-mod-httapi \
    freeswitch-mod-lua \
    freeswitch-mod-native-file \
    freeswitch-mod-shout \
    freeswitch-mod-sndfile \
    freeswitch-mod-tone-stream \
    freeswitch-mod-valet-parking \
    freeswitch-mod-voicemail \
    freeswitch-mod-conference \
    freeswitch-mod-spandsp \
    freeswitch-mod-opus \
    freeswitch-mod-verto \
    freeswitch-mod-rtc \
    freeswitch-sounds-en-us-callie \
    freeswitch-music-default \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /etc/freeswitch /var/log/freeswitch /var/run/freeswitch /var/lib/freeswitch

# Copy configuration files
COPY conf/ /etc/freeswitch/

# Set permissions
RUN chown -R freeswitch:freeswitch /etc/freeswitch /var/log/freeswitch /var/run/freeswitch /var/lib/freeswitch

# Expose ports
# SIP
EXPOSE 5060/udp
EXPOSE 5060/tcp
EXPOSE 5080/udp
EXPOSE 5080/tcp
# RTP
EXPOSE 16384-32768/udp
# Event Socket
EXPOSE 8021/tcp
# WebSocket (Verto)
EXPOSE 8081/tcp
EXPOSE 8082/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD fs_cli -x "status" || exit 1

# Run as freeswitch user
USER freeswitch

# Start FreeSWITCH
CMD ["/usr/bin/freeswitch", "-nonat", "-c"]
