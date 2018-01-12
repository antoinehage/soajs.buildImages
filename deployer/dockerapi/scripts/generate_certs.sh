#!/bin/bash

CERTS_PASSWORD=""
CERTS_FOLDER="$(pwd)/../certs"

generatePass(){
    CERTS_PASSWORD=$(cat /dev/urandom | \
                    tr -dc 'a-zA-Z0-9' | \
                    fold -w 32 | head -n 1)
    echo "Generated certs password: ${CERTS_PASSWORD}"
}

generateCertificates(){
    openssl genrsa \
            -out ${CERTS_FOLDER}/client-key.pem 4096

    openssl req -sha256 -new -subj '/CN=client' \
            -key ${CERTS_FOLDER}/client-key.pem \
            -out ${CERTS_FOLDER}/client.csr

    openssl x509 -req \
            -passin pass:${CERTS_PASSWORD} \
            -in ${CERTS_FOLDER}/client.csr \
            -signkey ${CERTS_FOLDER}/client-key.pem \
            -out ${CERTS_FOLDER}/client-cert.pem

    rm ${CERTS_FOLDER}/client.csr
}

run(){
    generatePass
    generateCertificates
}

run
