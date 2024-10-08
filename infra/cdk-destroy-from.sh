#!/usr/bin/env bash
if [[ $# -ge 2 ]]; then
    export AWS_ACCOUNT_ID=$1
    export AWS_REGION=$2
    export AWS_PROFILE=$3
    if [ -z "$AWS_PROFILE" ]
    then
      AWS_PROFILE="default"
    fi
    shift; shift
    npx cdk destroy "*" --profile $AWS_PROFILE
    exit $?
else
    echo 1>&2 "Make sure to provide the following arguments in order to use this script correctly:"
    echo 1>&2 "./cdk-destroy-from.sh [AWS_ACCOUNT_ID] [AWS_REGION_ID] (optional)[AWS_PROFILE_NAME]"
    exit 1
fi