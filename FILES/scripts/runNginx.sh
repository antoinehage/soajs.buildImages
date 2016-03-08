#!/bin/bash

[ ${SOAJS_NX_SITE_PATH} ] && nxSitePath=${SOAJS_NX_SITE_PATH} || nxSitePath="/opt/soajs/site"
[ ${SOAJS_GIT_BRANCH} ] && BRANCH=${SOAJS_GIT_BRANCH} || BRANCH="master"
[ ${SOAJS_GIT_DASHBOARD_BRANCH} ] && dashboardDeployment=1 || dashboardDeployment=0
function nxSuccess()
{
    echo "nginx config preparation done successfully"

    mkdir -p ${nxSitePath}
    mkdir -p ${nxSitePath}"_tmp"

    pushd ${nxSitePath}"_tmp"

    if [ ${dashboardDeployment} == 1 ]; then
        git clone -b ${SOAJS_GIT_DASHBOARD_BRANCH} https://github.com/soajs/soajs.dashboard.git
        cp -Rf ${nxSitePath}"_tmp/"soajs.dashboard/ui/*  ${nxSitePath}"/"
        echo "deployed dashboard UI"
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        if [ ${SOAJS_GIT_TOKEN} ]; then
            echo "Deploy from github private repo"
            git clone -b ${BRANCH} https://${SOAJS_GIT_TOKEN}@github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
            cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/*  ${nxSitePath}"/"
        else
            echo "Deploy from github public repo"
            git clone -b ${BRANCH} https://github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
            cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/*  ${nxSitePath}"/"
        fi
        echo "deployed additional custom dashboard UI"
    else
        echo "no additional custom dashboard UI to deploy"
    fi
    popd
    rm -Rf ${nxSitePath}"_tmp"

    echo "starting nginx ..."
    service nginx start
}
function nxFailure()
{
    echo "nginx config preparation failed"
}

node /opt/soajs/FILES/deployer/nginx.js &
b=$!
wait $b && nxSuccess || nxFailure