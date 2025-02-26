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
    rm -rf node_modules
    npm install
    npm run build

    if [ "$DEV_ENV" = "local" ]; then
        echo "Deploying in a local development environment"
        npx cdklocal bootstrap aws://000000000000/us-east-1
        npx cdklocal deploy "*"
    else
        echo "Deploying on a non-local environment: $DEV_ENV"
        npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --profile $AWS_PROFILE
        npx cdk deploy "*" --profile $AWS_PROFILE
    fi

    exit $?
else
    echo 1>&2 "Make sure to provide the following arguments in order to use this script correctly:"
    echo 1>&2 "./cdk-deploy-to.sh [DEV_ENV] [AWS_ACCOUNT_ID] [AWS_REGION_ID] (optional)[AWS_PROFILE_NAME]"
    exit 1
fi