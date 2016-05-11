#!/bin/bash


function HELP() {
    echo ''
    echo 'Deploy & control SOAJS nginx or services instances'
    echo 'Version: 0.0.1'
    echo 'Author:'
    echo '  SOAJS Contributors - <https://github.com/soajs/>'
    echo ''
    echo 'Usage: soajsDeployer [OPTIONS [arg...]]'
    echo ''
    echo 'OPTIONS:'
    echo '  -T		(required): Deployment type: nginx || service'
    echo '  -X		(required): Exec command: deploy || redeploy'
    echo '  -G		(optional): The GIT server source: gitbuh || bitbucket. Default [github]'
    echo '  -M		(optional): works with type [service]. Main file if not [ /. ] for service to run'
    echo '  -P		(optional): Works with type [service]. Set SOAJS_SRVIP'
    echo '  -S		(optional): Works with type [service]. The IP_SUBNET to be used to fetch the container IP to set SOAJS_SRVIP'
    echo '  -c		(optional): Works with type [nginx] redeploy to rebuild nginx config files'
}

function clone() {
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

# ------ NGINX BEGIN
function nxFetchCode(){
    echo $'\n- SOAJS Deployer fetching the needed code ... '

    local nxSitePath="/opt/soajs/site"
    if [ -n "${SOAJS_NX_SITE_PATH}" ]; then
        nxSitePath=${SOAJS_NX_SITE_PATH}
    fi
    local BRANCH="master"
    if [ -n "${SOAJS_GIT_BRANCH}" ]; then
        BRANCH=${SOAJS_GIT_BRANCH}
    fi
    local dashboardDeployment=0
    if [ -n "${SOAJS_GIT_DASHBOARD_BRANCH}" ]; then
        dashboardDeployment=1
    fi

    mkdir -p ${nxSitePath}
    mkdir -p ${nxSitePath}"_tmp/_temp_site"

    pushd ${nxSitePath}"_tmp" > /dev/null 2>&1

    local copySite=0

    if [ ${dashboardDeployment} == 1 ]; then
        clone "soajs.dashboard" "soajs" ${SOAJS_GIT_DASHBOARD_BRANCH} ${SOURCE}
        cp -Rf ${nxSitePath}_tmp/soajs.dashboard/ui/* ${nxSitePath}_tmp/_temp_site/
        copySite=1
        echo "    ... deployed dashboard UI"
    fi

    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        clone ${SOAJS_GIT_REPO} ${SOAJS_GIT_OWNER} ${BRANCH} ${SOURCE} ${SOAJS_GIT_TOKEN}
        cp -Rf ${nxSitePath}_tmp/${SOAJS_GIT_REPO}/* ${nxSitePath}_tmp/_temp_site/
        copySite=1
        echo "    ... deployed custom site UI"
     else
        echo "- No custom site UI to deploy"
    fi

    if [ ${copySite} == 1 ]; then
        rm -Rf ${nxSitePath}"/*"
        cp -Rf ${nxSitePath}_tmp/_temp_site/* ${nxSitePath}/
    fi

    popd > /dev/null 2>&1
    rm -Rf ${nxSitePath}"_tmp"

    echo $'- SOAJS Deployer fetching code ... DONE'
}
function nxDeploySuccess() {
    echo "- Nginx config preparation done successfully"
    nxFetchCode
    echo $'\n- SOAJS Deployer starting nginx ... '
    service nginx start
}
function nxRedeploySuccess() {
    echo "- Nginx config preparation done successfully"
    nxFetchCode
    echo $'\n- SOAJS Deployer reloading nginx ... '
    nginx -s reload
}
function nxFailure() {
    echo "ERROR: nginx deployer failed .... exiting :( !"
}
function deployNginx() {
    echo $'\n- SOAJS Deployer - Deploying nginx ...'
    echo $'\n- SOAJS Deployer building the needed nginx configuration ... '
    node ./nginx.js &
    local b=$!
    wait $b && nxDeploySuccess || nxFailure
}
function reDeployNginx() {
    echo $'\n- SOAJS Deployer - reDeploying nginx ...'
    if [ ${REBUILD_NX_CONF} == 0 ]; then
        nxFetchCode
    else
        node ./nginx.js &
        local b=$!
        wait $b && nxRedeploySuccess || nxFailure
    fi
}
function persistNginxEnvsBuild() {
    node ./nginxEnvsPersist.js
}
function persistNginxEnvsExec() {
    if [ -f "/opt/soajs/FILES/nginxEnvsPersist.sh" ]; then
        chmod 777 /opt/soajs/FILES/nginxEnvsPersist.sh
        /opt/soajs/FILES/nginxEnvsPersist.sh
    fi
}
# ------ NGINX END

# ------ SERVICE BEGIN
function serviceDependencies() {
    echo $'\n- SOAJS Deployer installing dependencies ... '
    pushd ${DEPLOY_FOLDER}${SOAJS_GIT_REPO} > /dev/null 2>&1
    npm install > /dev/null 2>&1
    npm ls
    popd > /dev/null 2>&1
}
function serviceCodePull() {
    echo $'\n- SOAJS Deployer - reDeploying service ...'
    pushd ${DEPLOY_FOLDER}${SOAJS_GIT_REPO} > /dev/null 2>&1
    local BRANCH="master"
    if [ -n "${SOAJS_GIT_BRANCH}" ]; then
        BRANCH=${SOAJS_GIT_BRANCH}
    fi
    echo $'\- Pulling new code ... '
    git checkout ${BRANCH}
    git pull
    popd > /dev/null 2>&1
}
function serviceCode() {
    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        if [ ! -d "${DEPLOY_FOLDER}${SOAJS_GIT_REPO}" ]; then
            pushd ${DEPLOY_FOLDER} > /dev/null 2>&1
            local BRANCH="master"
            if [ -n "${SOAJS_GIT_BRANCH}" ]; then
                BRANCH=${SOAJS_GIT_BRANCH}
            fi
            clone ${SOAJS_GIT_REPO} ${SOAJS_GIT_OWNER} ${BRANCH} ${SOURCE} ${SOAJS_GIT_TOKEN}
            popd > /dev/null 2>&1
        else
            serviceCodePull
        fi

        serviceDependencies

        echo $'\n- SOAJS Deployer starting service ... '
        echo "    -->    ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${MAIN}"
        node ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${MAIN}
    else
        echo "ERROR: unable to find environment variable SOAJS_GIT_REPO or SOAJS_GIT_OWNER. nothing to deploy"
    fi
}
function serviceEnv() {
    echo $'\n- SOAJS Deployer preparing service ... '
    echo "- Service environment variables:"
    if [ ${SET_SOAJS_SRVIP} == 1 ]; then
        if [ -z "${SOAJS_SRVIP}" ]; then
            export SOAJS_SRVIP=$(/sbin/ip route|awk '/'${IP_SUBNET}'/ {print $9}')
        fi
        echo "    SOAJS_SRVIP="$SOAJS_SRVIP
    fi
    echo "    SOAJS_ENV="$SOAJS_ENV
    echo "    SOAJS_PROFILE="$SOAJS_PROFILE
    if [ -n "${SOAJS_GC_NAME}" ]; then
        echo "    SOAJS_GC_VERSION="$SOAJS_GC_VERSION
        echo "    SOAJS_GC_NAME="$SOAJS_GC_NAME
    fi
    serviceCode
}
function serviceFailure() {
    echo "ERROR: service deployer failed .... exiting :( !"
}
function deployService() {
    echo $'\n- SOAJS Deployer - Deploying service ...'
    echo $'\n- SOAJS Deployer building the needed PROFILE ... '
    node ./profile.js &
    local b=$!
    wait $b && serviceEnv || serviceFailure

}
function reDeployService() {
    if [ ${SOAJS_GIT_REPO} ] && [ ${SOAJS_GIT_OWNER} ]; then
        serviceCodePull
        serviceDependencies
    else
        echo "ERROR: unable to find environment variable SOAJS_GIT_REPO or SOAJS_GIT_OWNER. nothing to re-deploy"
    fi
}
# ------ SERVICE END

# DEPLOY_TYPE
#   1 -> nginx
#   2 -> service

# EXEC_CMD
#   1 -> deploy
#   2 -> redeploy

if [ $# -eq 0 ] ; then
	HELP
	exit 1
fi

EXEC_CMD=0
DEPLOY_TYPE=0
SET_SOAJS_SRVIP=0
IP_SUBNET='10.0.0.0'
MAIN="/."
DEPLOY_FOLDER="/opt/soajs/node_modules/"
SOURCE="github"
REBUILD_NX_CONF=0
while getopts T:X:M:PSG:c OPT; do
	case "${OPT}" in
        T)
            if [ ${OPTARG} == "nginx" ]; then
                DEPLOY_TYPE=1
            elif [ ${OPTARG} == "service" ]; then
                DEPLOY_TYPE=2
            else
                echo "-T: Unkown deployment type, it should be [nginx] or [service]."
                HELP
                exit 1
            fi
			;;
		X)
            if [ ${OPTARG} == "deploy" ]; then
                EXEC_CMD=1
            elif [ ${OPTARG} == "redeploy" ]; then
                EXEC_CMD=2
            else
                echo "-X: Unkown exec command, it should be [deploy] or [redeploy]."
                HELP
                exit 1
            fi
		    ;;
		M)
		    if [ -n "${OPTARG}" ]; then
		        MAIN=${OPTARG}
		    fi
		    ;;
		P)
		    SET_SOAJS_SRVIP=1
		    ;;
		S)
		    if [ -n "${OPTARG}" ]; then
		        IP_SUBNET=${OPTARG}
		    fi
		    ;;
		G)
		    if [ ${OPTARG} == "github" ] || [ ${OPTARG} == "bitbucket" ]; then
		        SOURCE=${OPTARG}
		    else
		        echo "-G: Unkown GIT source, only [github] and [bitbucket] are supported."
                HELP
                exit 1
		    fi
		    ;;
		c)
		    REBUILD_NX_CONF=1
		    ;;
		\?)
			HELP
			exit 1
		;;
	esac
done

if [ ${DEPLOY_TYPE} == 1 ] && [ ${EXEC_CMD} == 1 ]; then
    persistNginxEnvsExec
    deployNginx
elif [ ${DEPLOY_TYPE} == 1 ] && [ ${EXEC_CMD} == 2 ]; then
    persistNginxEnvsBuild
    persistNginxEnvsExec
    reDeployNginx
elif [ ${DEPLOY_TYPE} == 2 ] && [ ${EXEC_CMD} == 1 ]; then
    deployService
elif [ ${DEPLOY_TYPE} == 2 ] && [ ${EXEC_CMD} == 2 ]; then
    reDeployService
else
    HELP
fi