#!/bin/sh

# Replace env vars in JavaScript files
echo "Replacing env vars in JS"
for file in /app/js/app.*.js /app/index.html;
do
  echo "Processing $file ...";

  # Use the existing JS file as template
  if [ ! -f $file.tmpl.js ]; then
    cp $file $file.tmpl.js
  fi

  envsubst '$VUE_APP_API_URL,$VUE_APP_EMBED_URL,$WEBPACK_BASE_URL' < $file.tmpl.js > $file
done

echo "Starting Nginx"
exec nginx -g 'daemon off;'