#!/bin/bash

# some directories
THIS_DIR=`dirname "$THIS"`
export SATELLITE_HOME=`cd "$THIS_DIR/.." ; pwd`

# Proxy policy
# 0 : no proxy
# 1 : use fixed proxy
# 2 : use random proxy
export PROXY_POLICY=1
export PROXY_IP_PORT=222.133.31.130:2226

export SATELLITE=$SATELLITE_HOME/bin/satellite
# export SATELLITE_COOKIE_FILE=output/cookies/satellite.cookie.txt
export SATELLITE_COOKIE_FILE=output/cookies/satellite.cookie.$RANDOM.txt

export SATELLITE_LOG=$SATELLITE_HOME/logs
export SATELLITE_OUTPUT=$SATELLITE_HOME/output

# since phantomjs built-in process bugs, we must restart the system periodically.
# restart every SATELLITE_RESTART_PERIOD minutes
export SATELLITE_RESTART_PERIOD=30
