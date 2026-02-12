#!/bin/sh
set -e -o pipefail
export GARAGE_CONFIG_FILE=/$(dirname $0)/garage.toml

function edit_env {
    key=$1
    value=$2
    env_file=$3

    if grep $key $env_file > /dev/null; then
        sed -i s!$key=.*!$key=$value! $env_file
    else
        echo $key=$value >> $env_file
    fi
}

if [ ! -f "$GARAGE_CONFIG_FILE" ]; then
    $(dirname $0)/generate-config-object-storage.sh

    garage server &> /dev/null &

    sleep 3

    node_id=$(garage status | tail -n1 | cut -f1 -d' ')

    echo ID du node: ${node_id}
    echo -n Configuration du layout du cluster...
    garage layout assign -z dc1 -c 1G ${node_id} &> /dev/null
    garage layout apply --version 1 &> /dev/null
    echo " fait!"

    echo -n "Configuration du bucket..."
    garage bucket create pitchou-dev &> /dev/null

    key_info=$(RUST_LOG=error garage key create pitchou-app-key)

    echo "${key_info}" > /tmp/info

    key_id=$(echo "${key_info}" | grep 'Key ID' | cut -d: -f2 | tr -d ' ')
    secret=$(echo "${key_info}" | grep 'Secret key' | cut -d: -f2 | tr -d ' ')

    garage bucket allow --read --write --owner pitchou-dev --key pitchou-app-key &> /dev/null
    echo " fait!"

    docker_gateway=$(ip r | grep default | cut -d' ' -f3)

    config=$(dirname $0)/s3_config.sh

    cat<<EOF > $config
export AWS_ACCESS_KEY_ID="$key_id"
export AWS_SECRET_ACCESS_KEY="$secret"
export AWS_DEFAULT_REGION='garage'
export AWS_ENDPOINT_URL='http://${docker_gateway}:3900'
EOF



    killall garage
fi

source $(dirname $0)/s3_config.sh

cp /env /env.edit

edit_env OBJECT_STORAGE_ACCESS_KEY_ID $AWS_ACCESS_KEY_ID /env.edit
edit_env OBJECT_STORAGE_SECRET_ACCESS_KEY $AWS_SECRET_ACCESS_KEY /env.edit
edit_env OBJECT_STORAGE_DEFAULT_REGION $AWS_DEFAULT_REGION /env.edit
edit_env OBJECT_STORAGE_ENDPOINT_URL $AWS_ENDPOINT_URL /env.edit
edit_env OBJECT_STORAGE_BUCKET_NAME pitchou-dev /env.edit

cat /env.edit > /env

exec garage server
