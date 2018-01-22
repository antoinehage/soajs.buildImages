#!/bin/bash

CERTS_PASSWORD=""
CERTS_FOLDER="$(pwd)/../certs"

createDir(){
    mkdir -p $CERTS_FOLDER
}

generateCertificates(){
    openssl genrsa \
            -out ${CERTS_FOLDER}/client-key.pem 4096

    openssl req -sha256 -new -subj '/CN=client' \
            -key ${CERTS_FOLDER}/client-key.pem \
            -out ${CERTS_FOLDER}/client.csr

    openssl x509 -req \
            -in ${CERTS_FOLDER}/client.csr \
            -signkey ${CERTS_FOLDER}/client-key.pem \
            -out ${CERTS_FOLDER}/client-cert.pem

    rm ${CERTS_FOLDER}/client.csr
}

run(){
    createDir
    generateCertificates
}

run
