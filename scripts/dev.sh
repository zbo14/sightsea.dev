#!/bin/bash

port=${1:-8000}
addr=${2:-127.0.0.1}

cd "$(dirname "$0")"/../public
python3 -m http.server --bind "$addr" "$port" &
cd ../src

trap 'pkill -P "$$"' SIGHUP SIGINT SIGTERM

inotifywait -m -q -r -e close_write,create,moved_to . |
while read -r dir action file; do
  echo "$dir$file: $action"

  case "$file" in
    *.js)
      npm run bundle
      ;;

    *.less)
      lessc "$dir$file" ../public/"$dir/${file/.less/.css}"
      ;;
  esac
done
