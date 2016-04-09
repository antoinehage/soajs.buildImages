#!/bin/bash

[ ${SOAJS_NX_SITE_PATH} ] && nxSitePath=${SOAJS_NX_SITE_PATH} || nxSitePath="/opt/soajs/site"
[ ${SOAJS_GIT_BRANCH} ] && BRANCH=${SOAJS_GIT_BRANCH} || BRANCH="master"
[ ${SOAJS_GIT_DASHBOARD_BRANCH} ] && dashboardDeployment=1 || dashboardDeployment=0
function nxSuccess()
{
    echo $'\n- SOAJS Deployer preparing nginx ... '
    echo "- Nginx config preparation done successfully"

    mkdir -p ${nxSitePath}
    mkdir -p ${nxSitePath}"_tmp"

    pushd ${nxSitePath}"_tmp" > /dev/null 2>&1

    if [ ${dashboardDeployment} == 1 ]; then
        git clone -b ${SOAJS_GIT_DASHBOARD_BRANCH} https://github.com/soajs/soajs.dashboard.git
        cp -Rf ${nxSitePath}"_tmp/"soajs.dashboard/ui/*  ${nxSitePath}"/"
        echo "    ... deployed dashboard UI"
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        if [ ${SOAJS_GIT_TOKEN} ]; then
            echo "- Deploying from github private repo"
            git clone -b ${BRANCH} https://${SOAJS_GIT_TOKEN}@github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        else
            echo "- Deploying from github public repo"
            git clone -b ${BRANCH} https://github.com/${SOAJS_GIT_OWNER}/${SOAJS_GIT_REPO}.git
        fi

        if [ -d "${nxSitePath}_tmp/${SOAJS_GIT_REPO}/ui" ]; then
            cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/ui/*  ${nxSitePath}"/"
        else
            cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/*  ${nxSitePath}"/"
        fi
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