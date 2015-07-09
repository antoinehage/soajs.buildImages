#!/bin/bash
export SOAJS_SRVIP=$(/sbin/ip route|awk '/172.17.0.0/ {print $9}')
export $HOSTNAME=hostname

echo "Info:"
echo "====="
echo "* HOSTNAME: $HOSTNAME"
echo "* IP ADDRESS: $SOAJS_SRVIP"
echo "* ENVIRONMENT: $SOAJS_ENV"
echo "* PROFILE: $SOAJS_PROFILE"

if [ -n "$SOAJS_GC_NAME" ]; then
echo $SOAJS_GC_VERSION
echo $SOAJS_GC_NAME
fi

echo "--------------------------------------------------------------------------------------------"
echo "Logs:"
echo "====="
node $1