#!/bin/bash
waitcmd="wait "
i=0
for url in $@; do
  /bin/sh ./test/wait-for-up.sh $url &
  # ((i=$i+1))
  let i=i+1
  waitcmd="$waitcmd%$i "
done
echo "Waiting for services..."
eval $waitcmd

ls pid.*.txt > /dev/null  2>&1

if [[ "$?" -eq "0" ]]; then
  #files exist!!
  echo "Services not up!!"
  exit 1
else
  echo "Services up!!"
fi
