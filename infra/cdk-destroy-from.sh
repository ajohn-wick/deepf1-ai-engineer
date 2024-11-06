#!/usr/bin/env bash
if [[ $# -ge 3 ]]; then
    export DEV_ENV=$1
    export AWS_ACCOUNT_ID=$2
    export AWS_REGION=$3
    export AWS_PROFILE=$4
    if [ -z "$AWS_PROFILE" ]
    then
      AWS_PROFILE="default"
    fi
    shift; shift
    if [ "$DEV_ENV" = "local" ]; then
        echo "Running in local development environment"
        npx cdklocal destroy "*"
    else
        echo "Running in non-local environment: $DEV_ENV"
        npx cdk destroy "*" --profile $AWS_PROFILE
    fi
    exit $?
else
    echo 1>&2 "Make sure to provide the following arguments in order to use this script correctly:"
    echo 1>&2 "./cdk-destroy-from.sh [DEV_ENV] [AWS_ACCOUNT_ID] [AWS_REGION_ID] (optional)[AWS_PROFILE_NAME]"
    exit 1
fi