#!/bin/bash

[ ${1} ] && WHAT_TO_RUN=${1} || WHAT_TO_RUN='/.'
[ ${2} ] && SET_SOAJS_SRVIP=${2} || SET_SOAJS_SRVIP='off'
[ ${3} ] && IP_SUBNET=${3} || IP_SUBNET='10.0.0.0'

DEPLOY_FOLDER="/opt/soajs/node_modules/"
[ ${SOAJS_GIT_BRANCH} ] && BRANCH=${SOAJS_GIT_BRANCH} || BRANCH="master"

function serviceSuccess()
{
    echo $'\n- SOAJS Deployer preparing service ... '
    echo "- Service environment variables:"

    if [ ${SET_SOAJS_SRVIP} == "on" ]; then
        export SOAJS_SRVIP=$(/sbin/ip route|awk '/'${IP_SUBNET}'/ {print $9}')
        echo $SOAJS_SRVIP
    fi
    echo "    SOAJS_ENV="$SOAJS_ENV
    echo "    SOAJS_PROFILE="$SOAJS_PROFILE

    if [ -n "$SOAJS_GC_NAME" ]; then
        echo "    SOAJS_GC_VERSION="$SOAJS_GC_VERSION
        echo "    SOAJS_GC_NAME="$SOAJS_GC_NAME
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        pushd ${DEPLOY_FOLDER} > /dev/null 2>&1
        if [ ${SOAJS_GIT_TOKEN} ]; then
            echo "- Deploy from github private repo"
            git clone -b ${BRANCH} https://${SOAJS_GIT_TOKEN}@github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        else
            echo "- Deploy from github public repo"
            git clone -b ${BRANCH} https://github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        fi
        popd > /dev/null 2>&1


        echo $'\n- SOAJS Deployer installing dependencies ... '
        pushd ${DEPLOY_FOLDER}${SOAJS_GIT_REPO} > /dev/null 2>&1
        npm install > /dev/null 2>&1
        npm ls
        popd > /dev/null 2>&1

        echo $'\n- SOAJS Deployer starting service ... '
        echo "    -->    ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${WHAT_TO_RUN}"
        node ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${WHAT_TO_RUN}
    else
        echo "ERROR: unable to find environment variable SOAJS_GIT_REPO or SOAJS_GIT_OWNER. nothing to deploy"
    fi
}
function serviceFailure()
{
    echo "ERROR: service config preparation failed .... exiting :( !"
}

echo $'\n- SOAJS Deployer building the needed PROFILE ... '
node /opt/soajs/FILES/deployer/profile.js &
b=$!
wait $b && serviceSuccess || serviceFailure