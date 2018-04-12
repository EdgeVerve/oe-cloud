#!/bin/bash

# sudo gem install git gitlab first
if ! which gitlab >/dev/null 2>&1; then
    echo "gitlab command not found. Install gitlab gem first"
    echo "    sudo gem install git gitlab"
    exit 1
fi

if [[ ! $GITLAB_PROJECT_ID ]]; then
    echo "Define project id in GITLAB_PROJECT_ID environment variable"
    exit 1
fi

# Get current branch from GIT
branch_name=$(git symbolic-ref -q HEAD)
branch_name=${branch_name##refs/heads/}
branch_name=${branch_name:-HEAD}

BRANCH=$branch_name

echo "Merge Request will go from branch $BRANCH to branch master!"

echo -n "Enter your title for Merge Request: "
read merge_request_title
echo

# See https://github.com/NARKOZ/gitlab
# see: http://www.rubydoc.info/gems/gitlab/3.4.0/Gitlab/Client/MergeRequests#create_merge_request-instance_method
gitlab create_merge_request $GITLAB_PROJECT_ID "$merge_request_title" "{source_branch: "$BRANCH", target_branch: 'master'}"