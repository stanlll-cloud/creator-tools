#!/bin/zsh
cd "${0:A:h}"
open http://127.0.0.1:3087
/usr/bin/python3 -m http.server 3087 --bind 127.0.0.1
