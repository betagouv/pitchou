#!/bin/bash
set -e -o pipefail

export DOCKER_UID="$(id -u)"
export DOCKER_GID="$(id -g)"

node_id=$(docker compose exec -e RUST_LOG=error object_storage /garage status | tail -n1 | cut -f1 -d' ')

echo ID du node: ${node_id}
echo -n Configuration du layout du cluster...
docker compose exec object_storage /garage layout assign -z dc1 -c 1G ${node_id} &> /dev/null
docker compose exec object_storage /garage layout apply --version 1 &> /dev/null
echo " fait!"

echo -n "Configuration du bucket..."
docker compose exec object_storage /garage bucket create pitchou-dev &> /dev/null

key_info=$(docker compose exec -e RUST_LOG=error object_storage /garage key create pitchou-app-key)

key_id=$(echo "${key_info}" | grep -Po 'Key ID: +\K(\S+)')
secret=$(echo "${key_info}" | grep -Po 'Secret key: +\K(\S+)')

docker compose exec object_storage /garage bucket allow --read --write --owner pitchou-dev --key pitchou-app-key &> /dev/null
echo " fait!"

docker_gateway=$(docker network inspect pitchou_default | jq ".[0].IPAM.Config.[0].Gateway" -r)

config=$(dirname $0)/s3_config.sh

cat<<EOF > $config
export AWS_ACCESS_KEY_ID="$key_id"
export AWS_SECRET_ACCESS_KEY="$secret"
export AWS_DEFAULT_REGION='garage'
export AWS_ENDPOINT_URL='http://$(docker_gateway):3900'
EOF

env_file=$(dirname $0)/s3_env

cat<<EOF > $env_file
OBJECT_STORAGE_ACCESS_KEY_ID="$key_id"
OBJECT_STORAGE_SECRET_ACCESS_KEY="$secret"
OBJECT_STORAGE_DEFAULT_REGION='garage'
OBJECT_STORAGE_ENDPOINT_URL=$(docker_gateway):3900
OBJECT_STORAGE_BUCKET_NAME=pitchou-dev
EOF


echo Utilisation:
echo "    source dev/s3_config.sh"
echo "    aws s3 ls s3://pitchou-dev"
