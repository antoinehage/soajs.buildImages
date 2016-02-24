#!/bin/bash

debootstrap --variant=minbase --verbose wily ./wily

rm -fr ./wily/var/cache/apt/archives/*.deb

cat > ./wily/etc/apt/sources.list << EOF
deb http://archive.ubuntu.com/ubuntu wily main universe multiverse restricted
deb-src http://archive.ubuntu.com/ubuntu wily main universe multiverse restricted
deb http://archive.ubuntu.com/ubuntu wily-updates main universe multiverse restricted
deb-src http://archive.ubuntu.com/ubuntu wily-updates main universe multiverse restricted
deb http://security.ubuntu.com/ubuntu wily-security main universe multiverse restricted
deb-src http://security.ubuntu.com/ubuntu wily-security main universe multiverse restricted
EOF

cat  > ./wily/usr/sbin/policy-rc.d << EOF
#!/bin/sh

exit 101
EOF
chmod +x ./wily/usr/sbin/policy-rc.d

cat > ./wily/etc/apt/apt.conf.d/25norecommends << EOF
APT
{
    Install-Recommends  "false";
    Install-Suggests    "false";
};
EOF

rm -Rf ./wily/usr/share/man/*
rm -Rf ./wily/usr/share/doc/*

cd ./wily
tar -zcvf ../wily.tar.gz .

cd ..
cat wily.tar.gz | docker import -m SOAJS_BASE - template:new

