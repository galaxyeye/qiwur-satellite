#!/bin/bash

# some directories
THIS="$0"
THIS_DIR=`dirname "$THIS"`

 . ${THIS_DIR}/../config/common.env.sh

declare SATELLITE_HOME
export PROXY_FILE=${SATELLITE_HOME}/output/proxy/jd.proxy.txt

# Proxy policy
# 0 : no proxy
# 1 : use fixed proxy
# 2 : use random proxy
export PROXY_POLICY=0

export SATELLITE_COOKIE_FILE=output/cookies/satellite.cookie.$RANDOM.txt

export SATELLITE_LOAD_IMAGES=false
