# OSRM mit Schweiz-Extrakt (OpenStreetMap) für Auto-Pendelzeiten (PRD 10.1).
# Daten werden beim Build vorbereitet (MLD: extract → partition → customize).
# Nur im privaten Railway-Netz erreichbar (osrm.railway.internal:5000, IPv6).

FROM curlimages/curl:8.11.1 AS download
RUN curl -4 -fsSL --retry 5 --retry-delay 10 --retry-all-errors -o /tmp/switzerland-latest.osm.pbf https://download.geofabrik.de/europe/switzerland-latest.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:v5.27.1 AS prepare
WORKDIR /data
COPY --from=download /tmp/switzerland-latest.osm.pbf ./
RUN osrm-extract -p /opt/car.lua switzerland-latest.osm.pbf \
 && osrm-partition switzerland-latest.osrm \
 && osrm-customize switzerland-latest.osrm \
 && rm switzerland-latest.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:v5.27.1
COPY --from=prepare /data /data
EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "--ip", "::", "--port", "5000", "--max-table-size", "1000", "/data/switzerland-latest.osrm"]
