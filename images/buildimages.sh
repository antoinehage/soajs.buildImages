#!/bin/bash

pushd ./base
./buildimage.sh
popd
pushd ./basenginx
./buildimage.sh
popd
pushd ./baseservice
./buildimage.sh
popd

