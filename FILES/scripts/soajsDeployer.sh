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
    echo '  -M		(optional): Main file if not [ /. ] for service to run'
    echo '  -P		(optional): Set SOAJS_SRVIP'
    echo '  -S		(optional): The IP_SUBNET to be used to fetch the container IP to set SOAJS_SRVIP'

}

function nxFetchCode(){
    echo $'\n- SOAJS Deployer fetching the needed code ... '

    local nxSitePath="/opt/soajs/site"
    if [ -n ${SOAJS_NX_SITE_PATH} ]; then
        nxSitePath=${SOAJS_NX_SITE_PATH}
    fi
    local BRANCH="master"
    if [ -n ${SOAJS_GIT_BRANCH} ]; then
        BRANCH=${SOAJS_GIT_BRANCH}
    fi
    local dashboardDeployment=0
    if [ -n ${SOAJS_GIT_DASHBOARD_BRANCH} ]; then
        dashboardDeployment=1
    fi

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
         cp -Rf ${nxSitePath}"_tmp/"${SOAJS_GIT_REPO}/*  ${nxSitePath}"/"
    else
        echo "- No additional custom site UI to deploy"
    fi
    popd > /dev/null 2>&1
    rm -Rf ${nxSitePath}"_tmp"

    echo $'- SOAJS Deployer fetching code ... DONE'
}
function nxSuccess() {
    echo "- Nginx config preparation done successfully"
    nxFetchCode
    echo $'\n- SOAJS Deployer starting nginx ... '
    service nginx start
}
function nxFailure() {
    echo "ERROR: nginx config preparation failed"
}

function deployNginx() {
    echo $'\n- SOAJS Deployer - Deploying nginx ...'
    echo $'\n- SOAJS Deployer building the needed nginx configuration ... '
    node /opt/soajs/FILES/deployer/nginx.js &
    b=$!
    wait $b && nxSuccess || nxFailure
}
function reDeployNginx() {
    echo $'\n- SOAJS Deployer - reDeploying nginx ...'
    nxFetchCode
}

function serviceSuccess() {
    echo $'\n- SOAJS Deployer preparing service ... '
    echo "- Service environment variables:"
    if [ ${SET_SOAJS_SRVIP} == 1 ]; then
        export SOAJS_SRVIP=$(/sbin/ip route|awk '/'${IP_SUBNET}'/ {print $9}')
        echo "    SOAJS_SRVIP="$SOAJS_SRVIP
    fi
    echo "    SOAJS_ENV="$SOAJS_ENV
    echo "    SOAJS_PROFILE="$SOAJS_PROFILE
    if [ -n "$SOAJS_GC_NAME" ]; then
        echo "    SOAJS_GC_VERSION="$SOAJS_GC_VERSION
        echo "    SOAJS_GC_NAME="$SOAJS_GC_NAME
    fi

    local BRANCH="master"
    if [ -n ${SOAJS_GIT_BRANCH} ]; then
        BRANCH=${SOAJS_GIT_BRANCH}
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
        echo "    -->    ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${MAIN}"
        node ${DEPLOY_FOLDER}${SOAJS_GIT_REPO}${MAIN}
    else
        echo "ERROR: unable to find environment variable SOAJS_GIT_REPO or SOAJS_GIT_OWNER. nothing to deploy"
    fi
}
function serviceFailure() {
    echo "ERROR: service config preparation failed .... exiting :( !"
}

function deployService() {
    echo $'\n- SOAJS Deployer - Deploying service ...'
    echo $'\n- SOAJS Deployer building the needed PROFILE ... '
    node /opt/soajs/FILES/deployer/profile.js &
    b=$!
    wait $b && serviceSuccess || serviceFailure

}
function reDeployService() {
    echo $'\n- SOAJS Deployer - reDeploying service ...'
    pushd ${DEPLOY_FOLDER}${SOAJS_GIT_REPO} > /dev/null 2>&1
    echo $'\- Pulling new code ... '
    git pull
    echo $'\- Installing dependencies ... '
    npm install > /dev/null 2>&1
    npm ls
    popd > /dev/null 2>&1
}


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

DEPLOY_TYPE=0
SET_SOAJS_SRVIP=0
IP_SUBNET='10.0.0.0'
MAIN="/."
DEPLOY_FOLDER="/opt/soajs/node_modules/"

while getopts T:X:M:PS OPT; do
	case "${OPT}" in
        T)
            if [ ${OPTARG} == "nginx" ]; then
                DEPLOY_TYPE=1
            elif [ ${OPTARG} == "service" ]; then
                DEPLOY_TYPE=2
            else
                echo "-T: Unkown deployment type!!!"
            fi
			;;
		X)
            if [ ${OPTARG} == "deploy" ]; then
                EXEC_CMD=1
            elif [ ${OPTARG} == "redeploy" ]; then
                EXEC_CMD=2
            else
                echo "-X: Unkown exec command!!!"
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
		\?)
			HELP
			exit 1
		;;
	esac
done

if [ ${DEPLOY_TYPE} == 1 ] && [ ${EXEC_CMD} == 1 ]; then
    deployNginx
elif [ ${DEPLOY_TYPE} == 1 ] && [ ${EXEC_CMD} == 2 ]; then
    reDeployNginx
elif [ ${DEPLOY_TYPE} == 2 ] && [ ${EXEC_CMD} == 1 ]; then
    deployService
elif [ ${DEPLOY_TYPE} == 2 ] && [ ${EXEC_CMD} == 2 ]; then
    reDeployService
else
    HELP
fi