FROM alpine

RUN wget https://garagehq.deuxfleurs.fr/_releases/v2.2.0/x86_64-unknown-linux-musl/garage -O /usr/bin/garage && \
    chmod +x /usr/bin/garage && \
    apk add -Uuv groff less python3 py-pip && \
    pip install --break-system-packages awscli && \
    mkdir /workspace

ADD ./generate-config-object-storage.sh ./object-storage-entry-point.sh /workspace/

CMD /workspace/object-storage-entry-point.sh
