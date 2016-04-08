#!/bin/bash

[ ${SOAJS_NX_SITE_PATH} ] && nxSitePath=${SOAJS_NX_SITE_PATH} || nxSitePath="/opt/soajs/site"
[ ${SOAJS_GIT_BRANCH} ] && BRANCH=${SOAJS_GIT_BRANCH} || BRANCH="master"
[ ${SOAJS_GIT_DASHBOARD_BRANCH} ] && dashboardDeployment=1 || dashboardDeployment=0
[ ${SOAJS_GIT_SOURCE} ] && SOURCE=${SOAJS_GIT_SOURCE} || SOURCE="github"

function clone()
{
    local _REPO=${1}
    local _OWNER=${2}
    local _BRANCH=${3}
    local _SOURCE=${4}
    local _TOKEN=${5}

    if [ ${_TOKEN} ]; then
        echo "- Deploying from ${_SOURCE} private repo"
        if [ ${_SOURCE} == "github" ]; then
            git clone -b ${_BRANCH} https://${_TOKEN}@github.com/${_OWNER}/${_REPO}.git
        elif [ ${_SOURCE} == "bitbucket" ]; then
            git clone -b ${_BRANCH} https://x-token-auth:${_TOKEN}@bitbucket.org/${_OWNER}/${_REPO}.git
        fi
    else
        echo "- Deploying from ${_SOURCE} public repo"
        if [ ${_SOURCE} == "github" ]; then
            git clone -b ${_BRANCH} https://github.com/${_OWNER}/${_REPO}.git
        elif [ ${_SOURCE} == "bitbucket" ]; then
            git clone -b ${_BRANCH} https://bitbucket.org/${_OWNER}/${_REPO}.git
        fi
    fi

}

function nxSuccess()
{
    echo $'\n- SOAJS Deployer preparing nginx ... '
    echo "- Nginx config preparation done successfully"

    mkdir -p ${nxSitePath}
    mkdir -p ${nxSitePath}"_tmp"

    pushd ${nxSitePath}"_tmp" > /dev/null 2>&1

    if [ ${dashboardDeployment} == 1 ]; then
        clone "soajs.dashboard" "soajs" ${SOAJS_GIT_DASHBOARD_BRANCH} ${SOURCE}
        cp -Rf ${nxSitePath}"_tmp/"soajs.dashboard/ui/*  ${nxSitePath}"/"
        echo "    ... deployed dashboard UI"
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        clone ${SOAJS_GIT_REPO} ${SOAJS_GIT_OWNER} ${BRANCH} ${SOURCE} ${SOAJS_GIT_TOKEN}
        cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/*  ${nxSitePath}"/"
     else
        echo "- No additional custom site UI to deploy"
    fi

    popd > /dev/null 2>&1

    rm -Rf ${nxSitePath}"_tmp"

    echo $'\n- SOAJS Deployer starting nginx ... '
    service nginx start
}
function nxFailure()
{
    echo "ERROR: nginx config preparation failed"
}

echo $'\n- SOAJS Deployer building the needed configuration ... '
node /opt/soajs/FILES/deployer/nginx.js &
b=$!
wait $b && nxSuccess || nxFailure