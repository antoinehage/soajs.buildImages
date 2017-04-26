FROM ubuntu:16.04
MAINTAINER SOAJS Team <team@soajs.org>

RUN apt-get update && \
    apt-get install --fix-missing -y git curl make g++ libssl-dev libcurl3 && \
    curl -sL https://deb.nodesource.com/setup_6.x | bash && \
    apt-get install --fix-missing -y nodejs

CMD ["/bin/bash"]
