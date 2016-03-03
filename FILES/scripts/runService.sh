#!/bin/bash

WHAT_TO_RUN=$1
IP_SUBNET=$3
SET_SOAJS_SRVIP=$2
DEPLOY_FOLDER="/opt/soajs/node_modules/"
[ ${SOAJS_GIT_BRANCH} ] && BRANCH=${SOAJS_GIT_BRANCH} || BRANCH="master"

function serviceSuccess()
{
    echo "service config preparation done successfully"

    if [ ${SET_SOAJS_SRVIP} == "on" ]; then
        export SOAJS_SRVIP=$(/sbin/ip route|awk '/'${IP_SUBNET}'/ {print $9}')
        echo $SOAJS_SRVIP
    fi
    echo $SOAJS_ENV
    echo $SOAJS_PROFILE

    if [ -n "$SOAJS_GC_NAME" ]; then
        echo $SOAJS_GC_VERSION
        echo $SOAJS_GC_NAME
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        pushd ${DEPLOY_FOLDER}
        if [ ${SOAJS_GIT_TOKEN} ]; then
            echo "Deploy from github private repo"
            git clone -b ${BRANCH} https://${SOAJS_GIT_TOKEN}@github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        else
            echo "Deploy from github public repo"
            git clone -b ${BRANCH} https://github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        fi
        popd
        echo "about to run service ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${WHAT_TO_RUN}"
        pushd ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}
        npm install
        popd
        node ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${WHAT_TO_RUN}
    else
        echo "ERROR: unable to find environment variable SOAJS_GIT_REPO or SOAJS_GIT_OWNER. nothing to deploy"
    fi
}
function serviceFailure()
{
    echo "service config preparation failed"
}

node /opt/soajs/FILES/deployer/profile.js &
b=$!
wait $b && serviceSuccess || serviceFailure