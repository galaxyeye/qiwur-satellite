#!/bin/bash

# some directories
THIS="$0"
THIS_DIR=`dirname "$THIS"`
export SATELLITE_HOME=`cd "$THIS_DIR/.." ; pwd`

export CASPER_HOME=$HOME/node_modules/casperjs

export PROXY_FILE=${SATELLITE_HOME}/output/proxy/proxy.txt

# Proxy policy
# 0 : no proxy
# 1 : use fixed proxy
# 2 : use random proxy
export PROXY_POLICY=0
export PROXY_IP_PORT=182.90.23.129:80

export SATELLITE_COOKIE_FILE=output/cookies/satellite.cookie.txt

export SATELLITE_LOG=${SATELLITE_HOME}/logs
export SATELLITE_OUTPUT=${SATELLITE_HOME}/output

# since phantomjs built-in process bugs, we must restart the system periodically.
# restart every SATELLITE_RESTART_PERIOD minutes
export SATELLITE_RESTART_PERIOD=30

export SATELLITE_LOAD_IMAGES=false
