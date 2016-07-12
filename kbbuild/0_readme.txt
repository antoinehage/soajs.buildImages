This is recommended to be done on a Ubuntu machine

Go in the 1st folder and run build.sh

This will create a new docker image called soajsorg/prebase

docker images to see them

In another tab:
docker run -it soajsorg/prebase

run the commands listed in 2nd_base.txt

In another tab:

docker ps

docker commit containerID soajsorg/base

docker run -it soajsorg/base

run the commands listed in 3rd_basenginx.txt

In another tab:

docker ps

docker commit containerID soajsorg/basenginx

In the previous tab where you have a running container type exit

docker run -it soajsorg/base

run the commands listed in 4th_baseservice.txt

In another tab:

docker ps

docker commit containerID soajsorg/baseservice

#login to docker hub
docker login

docker push soajsorg/base
docker push soajsorg/basenginx
docker push soajsorg/baseservice

