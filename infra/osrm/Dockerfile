# OSRM mit Schweiz-Extrakt (OpenStreetMap) für Auto-Pendelzeiten (PRD 10.1).
# Daten werden beim Build vorbereitet (MLD: extract → partition → customize).
FROM osrm/osrm-backend:latest AS prepare
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/* || true
WORKDIR /data
RUN wget -q https://download.geofabrik.de/europe/switzerland-latest.osm.pbf \
 && osrm-extract -p /opt/car.lua switzerland-latest.osm.pbf \
 && osrm-partition switzerland-latest.osrm \
 && osrm-customize switzerland-latest.osrm \
 && rm switzerland-latest.osm.pbf

FROM osrm/osrm-backend:latest
COPY --from=prepare /data /data
EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "--max-table-size", "1000", "/data/switzerland-latest.osrm"]
