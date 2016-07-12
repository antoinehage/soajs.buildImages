#!/bin/bash

rm -f wily.tar.gz
rm -Rf ./z
mkdir z
cp *.gz z
cd z
tar xvfz ubuntu-wily-core-cloudimg-amd64-root.tar.gz
rm ubuntu-wily-core-cloudimg-amd64-root.tar.gz
cd ./var/lib/apt/lists/
ls -1 | grep -v 'us.archive.ubuntu.com_ubuntu_dists_lucid_Release.gpg' | xargs rm -f
cd ../../../..
rm ./var/cache/apt/*.bin
rm -Rf ./usr/share/man/*
rm -Rf ./usr/share/doc/*
rm -Rf ./var/cache/apt/archives/*.deb
rm -f ./sbin/fsck*
rm -f ./sbin/mkfs*
rm -f ./sbin/resize2fs
rm -f ./bin/who
rm -f ./bin/whoami
rm -f ./bin/yes
rm -f ./bin/whereis
rm -f ./bin/test
rm -Rf ./usr/games
rm ./sbin/fsck*
rm ./sbin/mkfs*
rm ./sbin/resize2fs
rm ./bin/who
rm ./bin/whoami
rm ./bin/yes
rm ./bin/whereis
rm ./bin/test
rm ./var/cache/apt/*.bin
rm ./var/lib/apt/lists/a*
rm ./var/lib/apt/lists/s*

tar -czpf ../wily.tar.gz .
sync
cd ..

docker build -t soajsorg/prebase .

cd ..

echo "soajsorg/prebase image created"
echo "docker run -it soajsorg/prebase"


